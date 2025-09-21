import { useEffect, useRef, useState } from 'react'

export function useSpeechInput({ onText, enabledWhen = true } = {}) {
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef(null)
  const onTextRef = useRef(onText)

  // 最新のコールバック参照を維持（再初期化を防ぐ）
  useEffect(() => {
    onTextRef.current = onText
  }, [onText])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSpeechSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    }
  }, [])

  useEffect(() => {
    if (!voiceEnabled || !enabledWhen) {
      if (recognitionRef.current) {
        try { recognitionRef.current.onend = null } catch {}
        try { recognitionRef.current.stop() } catch {}
      }
      setIsRecognizing(false)
      return
    }

    if (!speechSupported) {
      setVoiceEnabled(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.interimResults = false
    recognition.continuous = true

    recognition.onstart = () => setIsRecognizing(true)
    recognition.onerror = () => setIsRecognizing(false)
    recognition.onend = () => {
      setIsRecognizing(false)
      if (voiceEnabled && enabledWhen) {
        try { recognition.start() } catch {}
      }
    }
    recognition.onresult = async (event) => {
      const lastIndex = event.results.length - 1
      const result = event.results[lastIndex]
      const transcript = (result?.[0]?.transcript || '').trim()
      if (transcript && onTextRef.current) {
        onTextRef.current(transcript)
      }
    }

    recognitionRef.current = recognition
    try { recognition.start() } catch {}

    return () => {
      try { recognition.onend = null } catch {}
      try { recognition.stop() } catch {}
      setIsRecognizing(false)
    }
  }, [voiceEnabled, speechSupported, enabledWhen])

  return {
    voiceEnabled,
    setVoiceEnabled,
    isRecognizing,
    speechSupported,
  }
}
