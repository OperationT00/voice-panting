import { useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type Options = {
  onResult: (text: string) => void;
  onError: (message: string) => void;
};

export function useSpeechRecognition({ onResult, onError }: Options) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const SpeechRecognitionCtor = getSpeechRecognition();
  const isSupported = Boolean(SpeechRecognitionCtor);

  const start = () => {
    if (!SpeechRecognitionCtor) {
      onError("当前浏览器不支持语音识别，请使用 Chrome 或 Edge");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const text = latest?.[0]?.transcript?.trim();
      if (text) {
        onResult(text);
      }
    };
    recognition.onerror = (event) => {
      onError(`语音识别出错：${event.error ?? "未知错误"}`);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  return { isSupported, isListening, start, stop };
}

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}
