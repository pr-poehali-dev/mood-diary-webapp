import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Emotion = 'positive' | 'neutral' | 'negative';

interface DiaryEntry {
  id: string;
  text: string;
  emotion: Emotion;
  advice: string;
  timestamp: Date;
}

const emotionConfig = {
  positive: {
    emoji: '😊',
    label: 'Позитивное',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    value: 1,
  },
  neutral: {
    emoji: '😐',
    label: 'Нейтральное',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    value: 0,
  },
  negative: {
    emoji: '😔',
    label: 'Негативное',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    value: -1,
  },
};

const adviceText = {
  positive: 'Кажется, у тебя отличное настроение! Запиши, что сделало этот день таким классным.',
  neutral: 'Спокойный день — тоже хорошо. Может, стоит попробовать сделать что-то приятное для себя?',
  negative: 'Ты звучишь немного грустно. Попробуй глубоко вдохнуть. Что именно тебя расстроило? Можешь рассказать мне.',
};

export default function Index() {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [useTextInput, setUseTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('mood-diary-entries');
    if (stored) {
      const parsed = JSON.parse(stored);
      setEntries(parsed.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) })));
    } else {
      const demoEntries: DiaryEntry[] = [
        {
          id: '1',
          text: 'Сегодня был отличный день! Встретился с друзьями, мы много смеялись и гуляли в парке.',
          emotion: 'positive',
          advice: adviceText.positive,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          id: '2',
          text: 'Работал весь день, ничего особенного не произошло. Обычный рабочий день.',
          emotion: 'neutral',
          advice: adviceText.neutral,
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          id: '3',
          text: 'Я устал сегодня в школе, было тяжело. Много домашних заданий.',
          emotion: 'negative',
          advice: adviceText.negative,
          timestamp: new Date(),
        },
      ];
      setEntries(demoEntries);
      localStorage.setItem('mood-diary-entries', JSON.stringify(demoEntries));
    }

    const darkMode = localStorage.getItem('mood-diary-theme') === 'dark';
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mood-diary-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mood-diary-theme', 'light');
    }
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: 'Ошибка',
        description: 'Голосовой ввод не поддерживается в этом браузере',
        variant: 'destructive',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedText(transcript);
      analyzeEmotion(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error === 'not-allowed') {
        toast({
          title: 'Нет доступа к микрофону',
          description: 'Разрешите доступ к микрофону в настройках браузера или используйте текстовый ввод',
          variant: 'destructive',
        });
        setUseTextInput(true);
      } else {
        toast({
          title: 'Ошибка записи',
          description: 'Не удалось распознать речь. Попробуйте еще раз.',
          variant: 'destructive',
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const analyzeEmotion = async (text: string) => {
    setIsAnalyzing(true);

    const positiveWords = ['хорошо', 'отлично', 'радост', 'счастлив', 'весел', 'классно', 'круто', 'люблю', 'прекрасно'];
    const negativeWords = ['плохо', 'грустно', 'устал', 'тяжело', 'болит', 'печаль', 'одинок', 'страшно', 'больно'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    let detectedEmotion: Emotion;
    if (positiveCount > negativeCount) {
      detectedEmotion = 'positive';
    } else if (negativeCount > positiveCount) {
      detectedEmotion = 'negative';
    } else {
      detectedEmotion = 'neutral';
    }

    setTimeout(() => {
      setEmotion(detectedEmotion);
      setIsAnalyzing(false);
      speakAdvice(adviceText[detectedEmotion]);
    }, 800);
  };

  const speakAdvice = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const saveEntry = () => {
    if (!recognizedText || !emotion) {
      toast({
        title: 'Ошибка',
        description: 'Сначала запишите текст и дождитесь анализа эмоции',
        variant: 'destructive',
      });
      return;
    }

    const newEntry: DiaryEntry = {
      id: Date.now().toString(),
      text: recognizedText,
      emotion,
      advice: adviceText[emotion],
      timestamp: new Date(),
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    localStorage.setItem('mood-diary-entries', JSON.stringify(updatedEntries));

    toast({
      title: 'Сохранено!',
      description: 'Запись добавлена в твой дневник',
    });

    setRecognizedText('');
    setEmotion(null);
    setTextInput('');
  };

  const handleTextAnalyze = () => {
    if (!textInput.trim()) {
      toast({
        title: 'Пустой текст',
        description: 'Напиши что-нибудь, чтобы я мог проанализировать твоё настроение',
        variant: 'destructive',
      });
      return;
    }
    setRecognizedText(textInput);
    analyzeEmotion(textInput);
  };

  const deleteEntry = (id: string) => {
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    localStorage.setItem('mood-diary-entries', JSON.stringify(updatedEntries));
    toast({
      title: 'Удалено',
      description: 'Запись удалена из дневника',
    });
  };

  const chartData = entries
    .slice(0, 10)
    .reverse()
    .map(entry => ({
      date: new Date(entry.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      mood: emotionConfig[entry.emotion].value,
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI-Дневник Настроения
            </h1>
            <p className="text-muted-foreground mt-1">Твой личный эмоциональный помощник</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            <Icon name={isDark ? 'Sun' : 'Moon'} size={20} />
          </Button>
        </div>

        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="record">
              <Icon name="Mic" size={18} className="mr-2" />
              Записать
            </TabsTrigger>
            <TabsTrigger value="diary">
              <Icon name="BookOpen" size={18} className="mr-2" />
              Записи
            </TabsTrigger>
            <TabsTrigger value="chart">
              <Icon name="LineChart" size={18} className="mr-2" />
              График
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="space-y-6 animate-slide-up">
            <Card>
              <CardHeader>
                <CardTitle>Запиши свои мысли</CardTitle>
                <CardDescription>
                  {useTextInput 
                    ? 'Напиши, как прошёл твой день' 
                    : 'Нажми на микрофон и расскажи, как прошёл твой день'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!useTextInput ? (
                  <>
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`w-24 h-24 rounded-full shadow-lg ${
                          isRecording ? 'animate-pulse-soft bg-red-500 hover:bg-red-600' : ''
                        }`}
                      >
                        <Icon name="Mic" size={40} />
                      </Button>
                    </div>

                    {isRecording && (
                      <p className="text-center text-sm text-muted-foreground animate-pulse">
                        Слушаю тебя...
                      </p>
                    )}

                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUseTextInput(true)}
                        className="text-muted-foreground"
                      >
                        <Icon name="Keyboard" size={16} className="mr-2" />
                        Использовать текстовый ввод
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Напиши, как прошёл твой день..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleTextAnalyze}
                          className="flex-1"
                          disabled={!textInput.trim()}
                        >
                          <Icon name="Sparkles" size={18} className="mr-2" />
                          Проанализировать
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUseTextInput(false)}
                          title="Переключиться на голосовой ввод"
                        >
                          <Icon name="Mic" size={18} />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {recognizedText && (
                  <Card className="bg-accent/50 animate-fade-in">
                    <CardHeader>
                      <CardTitle className="text-lg">Текст записи</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground">{recognizedText}</p>
                    </CardContent>
                  </Card>
                )}

                {isAnalyzing && (
                  <div className="text-center py-4 animate-pulse">
                    <Icon name="Brain" size={32} className="mx-auto mb-2 text-purple-600" />
                    <p className="text-sm text-muted-foreground">Анализирую эмоцию...</p>
                  </div>
                )}

                {emotion && !isAnalyzing && (
                  <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 animate-fade-in">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-3xl">{emotionConfig[emotion].emoji}</span>
                        Анализ эмоции
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Badge className={emotionConfig[emotion].color}>
                        {emotionConfig[emotion].label}
                      </Badge>
                      <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-foreground leading-relaxed">{adviceText[emotion]}</p>
                      </div>
                      <Button onClick={saveEntry} className="w-full" size="lg">
                        <Icon name="Save" size={18} className="mr-2" />
                        Добавить в дневник
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diary" className="animate-slide-up">
            <Card>
              <CardHeader>
                <CardTitle>Твои записи</CardTitle>
                <CardDescription>
                  {entries.length > 0 ? `Всего записей: ${entries.length}` : 'Пока нет записей'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {entries.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Icon name="BookOpen" size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Начни вести дневник, чтобы увидеть записи здесь</p>
                    </div>
                  ) : (
                    entries.map((entry) => (
                      <Card key={entry.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{emotionConfig[entry.emotion].emoji}</span>
                              <Badge className={emotionConfig[entry.emotion].color}>
                                {emotionConfig[entry.emotion].label}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEntry(entry.id)}
                            >
                              <Icon name="Trash2" size={16} />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {entry.timestamp.toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-foreground mb-3">{entry.text}</p>
                          <div className="p-3 bg-accent/30 rounded-lg text-sm text-muted-foreground">
                            {entry.advice}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart" className="animate-slide-up">
            <Card>
              <CardHeader>
                <CardTitle>График настроения</CardTitle>
                <CardDescription>Динамика твоих эмоций за последние записи</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="LineChart" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Сделай несколько записей, чтобы увидеть график</p>
                  </div>
                ) : (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" />
                        <YAxis domain={[-1, 1]} ticks={[-1, 0, 1]} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const value = payload[0].value as number;
                              const emotionKey = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="text-sm font-medium">
                                    {emotionConfig[emotionKey as Emotion].emoji}{' '}
                                    {emotionConfig[emotionKey as Emotion].label}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="mood"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}