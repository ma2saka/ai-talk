import { useEffect, useRef, useState } from 'react'

export function useSpeechInput({ onText, onInterim, enabledWhen = true } = {}) {
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef(null)
  const onTextRef = useRef(onText)
  const onInterimRef = useRef(onInterim)

  // 最新のコールバック参照を維持（再初期化を防ぐ）
  useEffect(() => {
    onTextRef.current = onText
  }, [onText])

  useEffect(() => {
    onInterimRef.current = onInterim
  }, [onInterim])

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
    recognition.interimResults = true
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
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (!res || !res[0]) continue
        if (res.isFinal) finalText += res[0].transcript
        else interim += res[0].transcript
      }
      if (interim && onInterimRef.current) onInterimRef.current(interim.trim())
      if (finalText && onTextRef.current) onTextRef.current(finalText.trim())
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
