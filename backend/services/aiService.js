// backend/aiService.js（統合・修正済み完全版）
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SpeechClient } = require('@google-cloud/speech');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const speechClient = new SpeechClient();
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const escapeControlCharsInJsonStrings = (jsonText = '') => {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonText.length; i += 1) {
    const char = jsonText[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      result += char;
      continue;
    }

    if (isEscaped) {
      result += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = false;
      continue;
    }

    const code = char.charCodeAt(0);
    if (code === 0x0a) {
      result += '\\n';
      continue;
    }
    if (code === 0x0d) {
      result += '\\r';
      continue;
    }
    if (code === 0x09) {
      result += '\\t';
      continue;
    }
    if (code < 0x20) {
      result += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }

    result += char;
  }

  return result;
};

const tryParseJson = (rawText) => {
  if (!rawText) {
    throw new Error('Empty JSON payload');
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    const sanitized = escapeControlCharsInJsonStrings(rawText);
    if (sanitized !== rawText) {
      try {
        const parsed = JSON.parse(sanitized);
        console.warn('Gemini応答内の制御文字をエスケープしてJSONを解析しました。');
        return parsed;
      } catch (sanitizedError) {
        sanitizedError.originalError = error;
        throw sanitizedError;
      }
    }
    throw error;
  }
};

/**
 * AIの応答からJSONオブジェクトを安全に抽出
 */
const parseJsonResponse = (text = '') => {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return tryParseJson(jsonMatch[1]);
    }
    return tryParseJson(text);
  } catch (error) {
    console.error('AI応答からのJSONパースに失敗:', error);
    return {
      response_text:
        text.replace(/```json\n([\s\S]*?)\n```/, '').trim() ||
        '申し訳ありません、応答を正しく処理できませんでした。',
      suggested_questions: []
    };
  }
};

/**
 * 新規会話: 導入メッセージ＋最初の質問候補（4件）
 */
const generateInitialMessage = async (employeeName, theme, stance) => {
  const prompt = `
あなたは、マネージャーの1on1を支援するAIアシスタントです。
以下の情報に基づき、1on1の導入メッセージと、最初の質問候補を生成してください。

# 1on1情報
- 部下の名前: ${employeeName}
- テーマ: ${theme}
- 関わり方: ${stance}

# 指示
- 応答は必ず下記のJSON形式で出力してください。
- response_textには、マネージャーを励ます導入メッセージと簡単な説明を入れてください。「承知いたしました。選択いただいたテーマと関わり方を念頭に置き、サポートさせていただきます。本日はこのテーマと関わり方で進めてまいります。それでは、1on1を進めてください。私はここで待機しています。サポートが必要になったらいつでも、このチャットに状況や疑問を具体的にお知らせください。」のような形式で記述してください。
- suggested_questionsには、テーマと関わり方を踏まえた具体的な質問を4つ格納してください。

# 出力形式 (JSON)
\`\`\`json
{
  "response_text": "string",
  "suggested_questions": [
    "string",
    "string",
    "string",
    "string"
  ]
}
\`\`\`
`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return parseJsonResponse(response.text());
};

/**
 * 途中会話: 次の応答（上司メモ）＋質問候補（4件）
 */
const generateFollowUp = async (history, theme, stance) => {
  const formattedHistory = history
    .map((msg) => `${msg.sender === 'user' ? 'マネージャー' : '部下'}: ${msg.message}`)
    .join('\n');

  const prompt = `
あなたは、1on1を実施する上司を支援するコーチングAIです。
以下の会話履歴と1on1情報に基づき、部下の発言から読み取れる心情・意図を推察しながら、上司が次にどう関わるべきかを助言してください。

# 1on1情報
- テーマ: ${theme}
- 関わり方: ${stance}

# これまでの会話
${formattedHistory}

# 指示
- 応答は必ず下記のJSON形式で出力してください。
- response_textは上司に向けたメモとして以下の2段落構成にしてください。
  1. 「部下の状態推察: ...」
  2. 「上司への提案: ...」
- suggested_questionsには、会話の流れを汲み取り、部下の内省を促すオープンクエスチョンを4つ。

# 出力形式 (JSON)
\`\`\`json
{
  "response_text": "string",
  "suggested_questions": [
    "string",
    "string",
    "string",
    "string"
  ]
}
\`\`\`
`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return parseJsonResponse(response.text());
};

/** レポート系プロンプト */
const getSummaryPrompt = (formattedMessages, transcript) => `
あなたは、1on1を実施する上司をサポートするエグゼクティブコーチです。以下の「AIとのチャット履歴」と「1on1の文字起こし」を分析し、上司が短時間で状況を把握し、次アクションを決められるレポートをMarkdownで作成してください。

文字起こしを分析する際は、雑談や誤認識を除き、業務・心理・コンディションに関わる重要情報にフォーカスしてください。

## AIとのチャット履歴
${formattedMessages}

## 1on1の文字起こし
${transcript}

## 出力フォーマット（日本語 / Markdown）
**ハイライト（最大3件）**
- ...
- ...

**部下の背景と意図（200〜300文字）**
- ...

**ネクストアクション（3件以内）**
- ...
`;

const getKeywordsPrompt = (formattedMessages) => `
以下の会話履歴を読み、主要なトピックを5〜10個、カンマ区切りで抽出してください。

**会話履歴:**
${formattedMessages}

**出力形式:**
キーワード1, キーワード2, ...
`;

const getSentimentPrompt = (formattedMessages) => `
以下の会話履歴を読み、会話全体の感情を分析し、指定のJSON形式で出力してください。

**会話履歴:**
${formattedMessages}

**出力形式:**
{
  "overall_sentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "positive_score": 0.0,
  "negative_score": 0.0,
  "neutral_score": 0.0
}
`;

const getIssuesSummaryPrompt = (transcript, conversationId) => `
あなたは会話分析コンサルタントです。以下の1on1の文字起こしから「課題・懸念事項」を最大3つ抽出し、25文字以内の簡潔なタイトルに要約してください。該当なしの場合は空配列[]。

\`\`\`json
[
  { "conversation_id": ${conversationId}, "text": "要約した課題タイトル1" }
]
\`\`\`

--- 文字起こし ---
${transcript}
`;

const getPositivesSummaryPrompt = (transcript, conversationId) => `
あなたは会話分析コンサルタントです。以下の1on1の文字起こしから「ポジティブな変化・成長」を最大3つ抽出し、25文字以内の簡潔なタイトルに要約してください。該当なしは[]。

\`\`\`json
[
  { "conversation_id": ${conversationId}, "text": "要約したポジティブなトピック1" }
]
\`\`\`

--- 文字起こし ---
${transcript}
`;

const getDeepDivePrompt = (queryText, context) => {
  const { theme, engagement, summary, nextActions, transcript, messages } = context || {};
  const formattedHistory = (messages || [])
    .map((m) => `${m.sender === 'user' ? '上司' : (m.sender === 'employee' ? '部下' : 'AI')}: ${m.message}`)
    .join('\n');

  return `あなたは、1on1を実施する上司を支援するエグゼクティブコーチです。以下の情報を踏まえ、指定テキストから「部下が何を感じ・考えているのか」を推察しつつ、上司がどう捉え、どう動くべきかを示してください。

【1on1メタ】
- テーマ: ${theme || '不明'}
- 関わり方: ${engagement || '不明'}

【要約】
${summary || '（要約なし）'}

【ネクストアクション】
${nextActions || '（提案なし）'}

【会話履歴（要約的）】
${formattedHistory || '（履歴なし）'}

【文字起こし（抜粋可）】
${(transcript || '').slice(0, 4000)}

【深掘り対象テキスト】
${queryText}

### 部下が伝えたいこと（推察）
- ...

### 上司として汲み取りたい視点
- ...

### 対話を深める問いかけ例
- ...

### フォローアップ行動（具体例）
- ...
`;
};

/** JSON/ブロック抽出に強い汎用呼び出し */
async function generateContent(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})|(\[[\s\S]*\])/);
    if (jsonMatch) {
      return jsonMatch[1] || jsonMatch[2] || jsonMatch[3] || text;
    }
    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to get response from AI.');
  }
}

/**
 * Google STT ストリームの寿命管理つきマネージャ
 * - 305秒制限前に自動ローテーション
 * - onRestartRequest を上位へコールバック
 */
function setupTranscriptionStream(onTranscription, options = {}) {
  const { onRestartRequest } = options;

  const requestConfig = {
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'ja-JP',
    enableAutomaticPunctuation: true,
    model: 'latest_long',
    speechContexts: [{ phrases: [], boost: 20 }],
    enableSpeakerDiarization: true,
    diarizationSpeakerCount: 2
  };

  const MAX_STREAM_DURATION_MS = 4 * 60 * 1000;
  const ROTATION_SAFETY_MS = 10 * 1000;

  let recognizeStream = null;
  let streamStartedAt = 0;
  let managerDestroyed = false;
  let rotationTimer = null;

  const handleStreamData = (data) => {
    if (data?.results?.[0]?.alternatives?.[0]) {
      const result = data.results[0];
      const transcript = result.alternatives[0].transcript;

      let speakerTag = null;
      const words = result.alternatives[0].words;
      if (Array.isArray(words) && words.length > 0) {
        speakerTag = words[0].speakerTag ?? null;
      }

      if (transcript) {
        onTranscription({
          transcript: transcript.trim(),
          speakerTag,
          isFinal: !!result.isFinal
        });
      }
    }
  };

  const clearRotationTimer = () => {
    if (rotationTimer) {
      clearTimeout(rotationTimer);
      rotationTimer = null;
    }
  };

  const requestRestart = (reason = 'manual') => {
    if (managerDestroyed) return;
    managerDestroyed = true;
    clearRotationTimer();
    if (recognizeStream) {
      recognizeStream.removeAllListeners();
      try {
        if (typeof recognizeStream.end === 'function') {
          try { recognizeStream.end(); } catch (_) { }
        }
        recognizeStream.destroy();
      } catch (error) {
        console.error('Failed to destroy recognize stream:', error);
      }
      recognizeStream = null;
    }
    if (typeof onRestartRequest === 'function') {
      setImmediate(() => onRestartRequest(reason));
    }
  };

  const handleStreamError = (err) => {
    console.error('Speech-to-Text API Error:', err);
    if (managerDestroyed) return;

    const code = err?.code;
    const details = (err?.details || '').toLowerCase();

    if (
      code === 8 || // RESOURCE_EXHAUSTED
      code === 4 || // DEADLINE_EXCEEDED
      code === 11 || // OUT_OF_RANGE
      details.includes('exceeded') ||
      details.includes('deadline') ||
      details.includes('out of range') ||
      details.includes('resource exhausted') ||
      details.includes('too much') ||
      details.includes('too many')
    ) {
      requestRestart('api-limit');
    } else {
      requestRestart(`api-error-${code ?? 'unknown'}`);
    }
  };

  const createStream = () => {
    if (managerDestroyed) return;

    clearRotationTimer();

    recognizeStream = speechClient.streamingRecognize({
      config: {
        ...requestConfig,                      // ← 修正: ドットではなくスプレッド
        enableAutomaticPunctuation: true
      },
      interimResults: true
    });

    recognizeStream.on('error', handleStreamError);
    recognizeStream.on('data', handleStreamData);

    streamStartedAt = Date.now();
    rotationTimer = setTimeout(() => {
      requestRestart('timer');
    }, Math.max(1000, MAX_STREAM_DURATION_MS - ROTATION_SAFETY_MS));
  };

  const write = (audioData) => {
    if (managerDestroyed) return;

    if (!recognizeStream || recognizeStream.destroyed) {
      requestRestart('stream-missing');
      return;
    }

    if (Date.now() - streamStartedAt >= MAX_STREAM_DURATION_MS - ROTATION_SAFETY_MS) {
      requestRestart('duration');
      return;
    }

    try {
      recognizeStream.write(audioData);
    } catch (error) {
      console.error('Failed to write audio data to recognize stream:', error);
      requestRestart('write-failed');
    }
  };

  const destroy = () => {
    managerDestroyed = true;
    clearRotationTimer();
    if (recognizeStream) {
      recognizeStream.removeAllListeners();
      try {
        if (typeof recognizeStream.end === 'function') {
          try { recognizeStream.end(); } catch (_) { }
        }
        recognizeStream.destroy();
      } catch (error) {
        console.error('Failed to destroy recognize stream:', error);
      }
      recognizeStream = null;
    }
  };

  createStream();

  return {
    write,
    destroy,
    get destroyed() {
      return managerDestroyed;
    }
  };
}

// 質問例の更新用プロンプト
function getRefreshQuestionsPrompt(context) {
  const { theme, engagement, messages } = context || {};
  const historyText = (messages || [])
    .map((m) => `${m.sender === 'user' ? '上司' : (m.sender === 'employee' ? '部下' : 'AI')}: ${m.message}`)
    .join('\n');

  return `
あなたは1on1の面談コーチです。以下の文脈（テーマ/関わり方/会話履歴）を踏まえ、
上司が次に投げかけられる短く具体的なオープンクエスチョンを最大8件、重複なく作成してください。

**禁止事項**
- 「その他」や「自由入力」などの汎用ワードは禁止
- 同義反復や似通った質問を作らない
- 固有名詞や個人情報は含めない

**出力形式（厳密にJSONのみ）**
\`\`\`json
{ "questions": ["質問例1", "質問例2", "質問例3"] }
\`\`\`

--- 文脈 ---
[テーマ]: ${theme || ''}
[関わり方]: ${engagement || ''}
[会話履歴]:
${historyText}
`;
}

// ワンポイントアドバイス（Markdown）
function getOnePointAdvicePrompt(context) {
  const { theme, engagement, summary, nextActions, transcript, formattedMessages } = context || {};
  return `
あなたはマネジャー向け1on1コーチです。以下の情報を読み、日本語のMarkdownで、現場で即使える「ワンポイントアドバイス」を出力してください。

**構成（見出しは太字）**
- **感情の読み取り**
- **傾聴のポイント**
- **次の一言の例**
- **注意点**

--- 文脈 ---
[テーマ]: ${theme || ''}
[関わり方]: ${engagement || ''}
[要約]: ${summary || ''}
[ネクストアクション]: ${nextActions || ''}
[文字起こし（抜粋可）]: ${(transcript || '').slice(0, 1500)}
[会話履歴整形]: ${formattedMessages || ''}
`;
}

module.exports = {
  generateInitialMessage,
  generateFollowUp,
  getSummaryPrompt,
  getDeepDivePrompt,
  getKeywordsPrompt,
  getSentimentPrompt,
  getIssuesSummaryPrompt,
  getPositivesSummaryPrompt,
  generateContent,
  setupTranscriptionStream,
  getRefreshQuestionsPrompt,
  getOnePointAdvicePrompt
};
