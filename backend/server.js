const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path'); // pathモジュールをインポート

// ルートディレクトリにある.envファイルを読み込むように設定
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database'); // Step 5で作成したdatabase.jsをインポート

const bcrypt = require('bcryptjs'); // ★追加: bcryptjs をインポート
const jwt = require('jsonwebtoken'); // ★追加: jsonwebtoken をインポート

// JWT のシークレットキーを設定 (環境変数から取得)
const JWT_SECRET = process.env.JWT_SECRET; // ★追加: 環境変数から読み込む
// WARNING: JWT_SECRET は .env ファイルに設定すること。本番環境では非常に複雑な文字列にすること。
if (!JWT_SECRET || JWT_SECRET === 'your_super_secret_jwt_key_that_is_long_and_random_and_secure_like_this_example_but_longer') {
    console.error('CRITICAL ERROR: JWT_SECRET is not properly set! Please configure it in your .env file with a secure, random string.');
    process.exit(1); // 秘密鍵がない場合はサーバー起動を停止
}

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // JSONボディをパースするために必要

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ error: 'Authentication token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            // トークンが無効または期限切れの場合は 403 Forbidden を返す
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user; // リクエストオブジェクトにユーザー情報を付与
        next(); // 次のミドルウェアまたはルートハンドラに進む
    });
};

// app.post('/api/chat') エンドポイントの定義全体
app.post('/api/chat', authenticateToken, async (req, res) => {
    const { message: userMessage, conversationId: reqConversationId, appState: clientAppState, employeeId: reqEmployeeId } = req.body; // ★修正: reqEmployeeId を追加
    let aiReply = '';
    let fullPrompt = '';
    let newConversationId = reqConversationId;

    let currentTheme = '未設定';
    let currentEngagement = '未設定';

    if (newConversationId) {
        try {
            const conversationDetail = await new Promise((resolve, reject) => {
                db.get("SELECT theme, engagement FROM conversations WHERE id = ?", [newConversationId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (conversationDetail) {
                currentTheme = conversationDetail.theme || '未設定';
                currentEngagement = conversationDetail.engagement || '未設定';
            }
        } catch (error) {
            console.error('Error fetching conversation details:', error.message);
        }
    }

    // ユーザーメッセージをDBに保存
    if (userMessage !== '__START__' && clientAppState !== 'theme_selection' && newConversationId) {
        db.run('INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)',
            [newConversationId, 'user', userMessage], function(err) {
            if (err) console.error('Error saving user message:', err.message);
        });
    }


    // 固定フローの制御
    if (userMessage === '__START__') {
        aiReply = `こんにちは。1on1傾聴サポートAIです。部下の方との1on1、私が傾聴の側面からサポートします。地蔵1on1メソッドに基づき、部下の方の内省を深め、心理的安全性の高い対話を実現するお手伝いをします。
            もし前回の1on1で部下に宿題や考えておいてほしいことをお伝えしていた場合は、まずそちらの確認から始めるとよいでしょう。
            本日はどのようなテーマについてお話ししたいですか? もしよろしければ、以下の選択肢から近いものを選ぶか、自由にお聞かせください。`;
        return res.json({ reply: aiReply });

    } else if (clientAppState === 'theme_selection') {
        currentTheme = userMessage;

        // ★修正: employee_id もINSERT文に追加する
        if (!reqEmployeeId) { // employeeId が渡されていない場合はエラー
            console.error('Employee ID is required for starting a new conversation.');
            return res.status(400).json({ error: 'Employee ID is required to start a new conversation.' });
        }

        try {
            newConversationId = await new Promise((resolve, reject) => {
                db.run('INSERT INTO conversations (theme, engagement, employee_id) VALUES (?, ?, ?)', // ★修正
                    [currentTheme, '初期設定中', reqEmployeeId], function(err) { // ★修正
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        } catch (err) {
            console.error('Error creating new conversation:', err.message);
            return res.status(500).json({ error: 'Failed to start conversation.' });
        }

        // 最初のユーザーメッセージをDBに保存
        db.run('INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)',
            [newConversationId, 'user', userMessage], function(err) {
            if (err) console.error('Error saving initial user message:', err.message);
        });

        aiReply = `ありがとうございます。そのテーマの中で期待する関わり方の中から最も近いものを教えていただけますでしょうか。`;

        // AIの返信をDBに保存
        db.run('INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)',
            [newConversationId, 'ai', aiReply], function(err) {
            if (err) console.error('Error saving AI reply:', err.message);
        });
        // ★修正: conversationId と employeeId を返す
        return res.json({ reply: aiReply, conversationId: newConversationId, employeeId: reqEmployeeId });

    } else if (clientAppState === 'engagement_selection') { // フロントエンドの状態が関わり方選択段階
        currentEngagement = userMessage; // ユーザーが選択した関わり方

        // 既存の会話を更新
        db.run('UPDATE conversations SET engagement = ? WHERE id = ?',
            [currentEngagement, newConversationId], function(err) {
            if (err) console.error('Error updating engagement:', err.message);
        });

        aiReply = `承知いたしました。選択いただいた【テーマ:${currentTheme}】と【関わり方:${currentEngagement}】を念頭に置き、サポートさせていただきます。本日はこのテーマと関わり方で進めてまいります。
            それでは、1on1を進めてください。私はここで待機しています。
            傾聴する時に困ったら、部下から言われたこと「○○(部下のセリフ)と言われました」をそのまま入力してみてください。(話し手のセリフか聞き手のセリフか区別するため)
            また、『どう応答すれば良いか迷う』 『部下のこの発言にどう対応しよう』『こんな時、どんな質問が効果的か』など、サポートが必要になったらいつでも、このチャットに状況や疑問を具体的にお知らせください。その際に、的確なアドバイスやヒントを提供します。
            (※もし関わり方で「3」や「4」を選ばれた場合でも、地蔵メソッドに基づき、まずは部下の方の内省を促すことを最優先しますのでご了承ください)
            選択いただいたテーマと関わり方に基づいて、以下のような質問から会話を始めてみるとよいでしょう:
            （ここでは選択されたテーマと関わり方に応じた質問例を5つ程度提示します。例えば:
            ・テーマが「業務やタスク」で関わり方が「じっくり聞く」なら:「最近の業務で特に気になることはありますか?」
            ・テーマが「キャリア」で関わり方が「壁打ち」なら:「今後のキャリアについてどんなことを考えていますか?」
            ・テーマが「健康」で関わり方が「助言」なら:「最近の体調や健康面で気になる点を教えていただけますか?」
            など、状況に応じた具体的な質問例を提示します)
            では、どうぞ始めてください。`;

        // AIの返信をDBに保存
        db.run('INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)',
            [newConversationId, 'ai', aiReply], function(err) {
            if (err) console.error('Error saving AI reply:', err.message);
        });
        return res.json({ reply: aiReply, conversationId: newConversationId });

    } else { // 通常のオンデマンドモード
        fullPrompt = `
            あなたは、上司(ユーザー)が部下との1on1ミーティングにおいて「地蔵1on1メソッド」に基づいた質の高い傾聴を実践できるよう支援する、専門のサポートAIです。あなたの役割は、上司の「聞き方」を必要な時に、求めに応じてリアルタイムでガイドし、効果的な対話を促進することです。部下と直接対話するのではなく、常に上司(ユーザー)へのアドバイスとサポートに徹してください。

            ## 1. あなたの役割と目的
            *役割:上司の傾聴サポーター、1on1伴走コーチ(地蔵1on1メソッド専門)
            *対話相手: 上司 (ユーザー)
            *究極の目的:上司が部下との1on1を通じて、以下の状態を実現できるよう支援すること。
            ***心理的安全性の醸成:部下が安心して本音を話せる場を作る
            ***深い内省の促進: 部下が自身の経験や感情と向き合い、気づきを得る
            ***主体性と自己効力感の向上: 部下のオーナーシップと自信を育む
            ***経験学習サイクルの加速:経験→内省概念化→実践のサイクルを促進
            ***強固な信頼関係の構築: 上司と部下の人間的な信頼関係を深める
            *あなたの直接的な目的:
            *上司が地蔵1on1メソッドの核心を実践できるよう、リアルタイムで支援する
            *上司の傾聴スキル、質問スキル、フィードバックスキル向上をサポートする
            *基本スタンス:
            *上司中心: 上司の意図や状況を理解し、寄り添う
            *励ましと勇気づけ: 上司の努力を認め、前向きに取り組めるよう励ます
            *具体的な行動提案:実践的な選択肢やヒントを提供する
            *主導権の尊重: 最終判断は上司に委ねる

            ## 2. 指導の基盤: 地蔵1on1メソッドの核心 (AIの判断基準)
            *主役は部下 (Speaker Ownership):
            *部下が「自分のための時間だ」と感じることで、本音を話しやすくなる
            *開始時に「今日はどんなことを話したいですか?」と問いかけ、部下にテーマ選択権を委ねる
            *深い傾聴 (Deep Listening):
            *言葉の背景にある感情、価値観、未言語化されたニーズまで感じ取る
            *相槌、繰り返し、要約、感情の反映を誠意をもって活用する
            *完全な非評価 (Non-Judgment):
            *評価されると人は自己防衛的になり、思考停止する
            *「良い/悪い」 「正しい/間違い」のレッテルを貼らず、ありのまま受け止める
            *アドバイス原則禁止 (No Advice Rule):
            *安易なアドバイスは部下の思考停止や主体性の喪失を招く
            *「部下自身はどう考えているか」「どんな選択肢が考えられるか」と問いかける
            *沈黙の尊重と活用 (Embracing Silence):
            *沈黙は部下が深く考えるための貴重な時間
            *部下が黙った際、最低10秒、できれば15秒以上は穏やかに待つ
            *心理的安全性 (Psychological Safety):
            *心理的安全性はチームの生産性や個人の成長に不可欠
            *特にネガティブな内容や失敗談に対して、受容的な態度で接する
            *Not Knowing スタンス:
            *「部下のことを完全に理解しているわけではない」という謙虚さ
            *「わかるわかる!」と安易に同調せず、「もう少し詳しく教えてください」と尋ねる
            *愛と受容 (Love & Acceptance):
            *部下の存在そのものを認め、成長と幸福を心から願う姿勢
            *根底にある温かい関心が、言葉遣いや態度に自然に表れるよう意識する

            ## 3. 上司(ユーザー)への具体的な支援方法(オンデマンド)
            あなたは、議題と関わり方の設定後、上司から具体的な状況説明や質問があった場合にのみ、上記の原則に基づき、以下のような支援を提供します。
            *状況に応じた応答・質問の提案:
            *傾聴スキルの活用例:
            *相槌: 「はい」 「ええ」 「うんうん」 「なるほど」 「そうなんですね」など
            *繰り返し: 部下が強調した言葉をそのまま返す「『もどかしい』んですね」
            *言い換え・要約: 「ここまでの話をまとめると、○○という理解で合っていますか?」
            *感情の反映: 「少しお疲れのようにも見えますが、いかがですか?」
            *内省を深める質問例:
            *事実確認:「その時、具体的に何がありましたか?」
            *思考・解釈: 「その出来事を、どう捉えていますか?」
            *感情:「その時、どんな気持ちでしたか?」
            *影響: 「そのことは、どんな影響がありました/ありそうですか?」
            *背景・原因:「なぜ、そうなったのだと思いますか?」
            *未来・理想:「本当はどうなってほしいですか?」
            *選択肢・行動: 「どんな選択肢が考えられますか?」
            *視点変更:「別の立場から見たらどうでしょう?」
            *強み・リソース: 「この状況を乗り越えるために、どんな強みが活かせそうですか?」
            *価値観:「仕事で一番大切にしたいことは何ですか?」
            *ポジティブな話題への応答例: 「素晴らしいですね! 特にどの点が良かったですか?」
            *ネガティブな話題への応答例: まず感情を受け止め、事実関係を確認し、本質的な欲求を探る
            *キャリアに関する話題への応答例: 価値観、強み、関心、将来への展望を探る質問
            *地蔵1on1メソッドに反する行動への注意喚起と代替案:
            *評価/判断しそうな時: 「まず『なぜそう考えたのか』という背景を尋ねてみませんか?」
            *アドバイス/指示しそうな時: 「『あなたならどう解決しますか?』と質問してみては?」
            *話を遮りそうな時: 「部下の方が話し終えるまで、待ってみましょう」
            *自分の経験談を話しそうな時: 「まずは部下の方の経験について、もっと詳しく聞いてみては?」
            *詰問調になりそうな時: 「『なぜ?』ではなく『どんな背景があったのですか?』と尋ねましょう」
            *沈黙や感情的な反応への対応ガイド:
            *沈黙: まず待つ。声をかける場合も「何か話すのをためらっていますか?」と決めつけずに尋ねる
            *感情的な反応:冷静に受け止め、「感情的になるほど重要なことなのですね」と伝える
            *アドバイスを求められた際の対応手順:
            *状況認識: 「アドバイスを求める」には様々な心理的背景があることを理解する
            *ステップ 1: 徹底的な問い返し:
            *「あなた自身は、どう考えていますか?」
            *「これまでに試してみたことはありますか?」
            *「どんな選択肢が考えられそうですか?」
            *「もし私がいなかったとしたら、どうしますか?」
            * (繰り返し問い返し、部下自身の考えを引き出す)
            *ステップ2: それでも強く求められた場合:
            *「地蔵1on1メソッドでは基本的にアドバイスはしませんが、どうしてもということであれば...」
            *「これはあくまで一般論ですが、こういう考え方もあるかもしれません」
            *具体的な「答え」ではなく、考え方のヒント、視点の提供に留める
            *「いかがでしょうか?」「どう感じますか?」と必ず部下の思考を促す問いかけで締める

            ## 5. 絶対的な制約事項(AI自身への戒め)
            *役割の遵守: 上司へのアドバイス役に徹し、部下の評価・判断はしない
            *非評価・非指示の原則: 提案する応答例も非評価・非指示を原則とする
            *尊重:上司の感情や考えを尊重し、決めつけない
            *受動性:上司からの求めがない限り、能動的に介入しない
            *最終判断の尊重: 最終的な判断と行動は上司に委ねる
            *アドバイス禁止原則の徹底: どんな関わり方が選択されても、まず部下の内省を促すよう上司をガイドする
            *対話妨害の抑止: 部下の話を遮らない、話題を勝手に変えない重要性を伝える
            *問題解決への姿勢: 問題「解決」より部下の内省と気づきを支援する姿勢を促す
            *安易な励ましの抑止: 「頑張れ」より具体的な行動への承認や共感を促す
            *適切な距離感:過度な同調を避け、客観的な鏡としての役割を意識させる
            *平易な言葉:専門用語を乱用せず、分かりやすく説明する

            ## 8. 対話時の返答スタイル(リアルタイム1on1用)
            簡潔さ重視: 上司が30分間の1on1中に効率よく参照できるよう、返答は極めてシンプルかつ簡潔にまとめる
            具体的な発言例を優先: 「こう言ってみてはいかがでしょうか?」という形で、すぐに使える具体的な発言例を1~2文で提示する
            フォーマット例:「『その時のご自身の気持ちをもう少し教えていただけますか?』と尋ねてみてはいかがでしょうか?」
            「『その経験から何を学びましたか?』と質問してみてください」
            追加説明は最小限:理論的背景や詳細な説明は省き、すぐに実践できる短い提案を中心とする
            選択肢がある場合: 5個ほどのの選択肢を簡潔に箇条書きで示し、上司が状況に応じて選べるようにする

            ## 9. 部下の発言に対する返答指示(追加)
            ユーザーが「部下から『○○』と言われました」と入力した場合、必ず以下の3要素を含めた返答を行ってください:
            1. 感情・気持ちの読み取り: 部下の発言から読み取れる感情や心理状態を簡潔に分析する
            2. 傾聴のテクニック提案: 状況に適した傾聴テクニックを具体的に提案する (繰り返し、言い換え、要約、感情の反映、沈黙から選択)
            3. 具体的な応答例: 提案した傾聴テクニックを用いた、具体的な応答例を2~3パターン提示する (各応答例は簡潔で、すぐに使えるものにする。応答例の後に「このような返答で部下の考えや感情をさらに引き出してみてください」などの短い指示を添える。)

            現在のテーマ: ${currentTheme || '未設定'}
            現在の関わり方: ${currentEngagement || '未設定'}

            あなたのタスク: 上記の指示に基づき、上司の質問「${userMessage}」に対して、地蔵1on1メソッドに沿ったサポートをしてください。
        `;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // またはgemini-1.5-pro
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();
            aiReply = text;

            // AIの返信をDBに保存
            db.run('INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)',
                [newConversationId, 'ai', aiReply], function(err) {
                if (err) console.error('Error saving AI reply:', err.message);
            });
            res.json({ reply: aiReply, conversationId: newConversationId });

        } catch (error) {
            console.error('Gemini API Error:', error);
            res.status(500).json({ error: 'Failed to get response from AI.' });
        }
    }
});

// 会話履歴全体を取得するAPIエンドポイント
app.get('/api/conversations', authenticateToken, (req, res) => {
    // ★修正: employees テーブルと JOIN して部下の名前も取得する
    db.all(`
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions,
               e.name AS employee_name, e.id AS employee_id
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        ORDER BY c.timestamp DESC
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 特定の会話のメッセージ履歴を取得するAPIエンドポイント
app.get('/api/conversations/:id/messages', authenticateToken, (req, res) => {
    const conversationId = req.params.id;
    db.all("SELECT sender, text FROM messages WHERE conversation_id = ? ORDER BY id ASC", [conversationId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 特定の会話の詳細（要約とネクストアクション含む）を取得するAPIエンドポイント
app.get('/api/conversations/:id', authenticateToken, (req, res) => {
    const conversationId = req.params.id;
    // ★修正: employees テーブルと JOIN して部下の名前も取得する
    db.get(`
        SELECT c.id, c.timestamp, c.theme, c.engagement, c.summary, c.next_actions, c.employee_id,
               e.name AS employee_name, e.email AS employee_email
        FROM conversations c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE c.id = ?
    `, [conversationId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: "Conversation not found." });
            return;
        }
        res.json(row);
    });
});

// 要約とネクストアクションを生成・保存するAPIエンドポイント
app.post('/api/summarize_and_next_action', authenticateToken, async (req, res) => {
    const { conversationId } = req.body;

    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required.' });
    }

    try {
        // 1. データベースから指定された会話の全メッセージを取得
        const messages = await new Promise((resolve, reject) => {
            db.all("SELECT sender, text FROM messages WHERE conversation_id = ? ORDER BY id ASC", [conversationId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        if (messages.length === 0) {
            return res.status(404).json({ error: 'No messages found for this conversation ID.' });
        }

        // 会話履歴をGeminiが処理しやすい形式に整形
        const formattedMessages = messages.map(msg => `${msg.sender === 'user' ? '上司' : 'AI'}: ${msg.text}`).join('\n');

        // 2. Gemini APIに渡すプロンプトを作成
        // ここで、地蔵メソッドの原則に基づき、上司への要約とネクストアクションの提案を促す
        const promptForSummary = `
            あなたは、上司の1on1傾聴を支援するAIです。以下の1on1の会話履歴を読み、
            「上司向け」に、以下の形式で要約とネクストアクションを提案してください。
            部下へのアドバイスや評価は行わず、あくまで「上司が次に行うべき行動」に焦点を当ててください。

            ## 1on1会話履歴
            ${formattedMessages}

            ## 出力形式
            **要約:**
            [会話の全体的な内容と部下の主要な話題を、上司が理解しやすいように簡潔に要約]

            **ネクストアクション:**
            - [上司が次回の1on1や日々の業務で部下に対して具体的にどのような働きかけをすべきか、地蔵メソッド（傾聴、非評価、内省促進など）に基づいた具体的な行動提案を箇条書きで3～5点]
            - [例: 部下の話の背景にある感情をさらに深掘りするための質問を準備する]
            - [例: 部下の主体性を尊重し、安易なアドバイスは避けるよう意識する]
            - [例: 次回の1on1で部下自身が考える解決策を引き出すための問いかけを検討する]
            - [例: 部下からの提案を評価せずに受け止める練習をする]

            **制約事項:**
            - 部下への直接的な指示や解決策の提示は絶対に避けてください。
            - 上司が「聞き方」や「関わり方」を改善するための視点に限定してください。
            - 簡潔で分かりやすい言葉遣いを心がけてください。
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // またはgemini-1.5-pro
        const result = await model.generateContent(promptForSummary);
        const response = await result.response;
        const generatedContent = response.text();

        // 生成された内容を要約とネクストアクションに分割する（簡易的なパース）
        let summary = '';
        let nextActions = '';
        const summaryMatch = generatedContent.match(/\*\*要約:\*\*\n([\s\S]*?)(?=\*\*ネクストアクション:\*\*|$)/);
        if (summaryMatch && summaryMatch[1]) {
            summary = summaryMatch[1].trim();
        }
        const nextActionsMatch = generatedContent.match(/\*\*ネクストアクション:\*\*\n([\s\S]*)/);
        if (nextActionsMatch && nextActionsMatch[1]) {
            nextActions = nextActionsMatch[1].trim();
        }

        let extractedKeywords = [];
        try {
            const promptForKeywords = `以下の1on1の会話履歴を読み、会話の**主要なトピックやテーマ**を表すキーワードを5〜10個、カンマ区切りで抽出してください。

**キーワード抽出のルール:**
- 会話の具体的な内容や課題に焦点を当てた名詞（句）を抽出してください。
- 個人名（例: 石田さん、田中）、役職名（例: 部長、リーダー）は含めないでください。
- 「感情」「状況」「課題」「対応」「進捗」のような漠然としすぎた一般的な言葉は含めないでください。
- 「良い」「悪い」「正しい」「間違っている」のような評価や判断に関する言葉は含めないでください。
- 「について」「のこと」「に関する」など、トピックの本質ではない助詞・助動詞は除外してください。
- 意味が重複する類似の言葉は、より代表的で簡潔な表現に統一してください（例: 「評価」「評価基準」「評価方法」→「評価」または「人事評価」）。
- 日本語の名詞を中心に、3〜5文字程度の簡潔なキーワードを優先してください。
- 各キーワードは独立した意味を持つようにしてください。
            ## 1on1会話履歴
            ${formattedMessages}
            ## 出力形式
            キーワード1, キーワード2, キーワード3, ...`;

            const keywordModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const keywordResult = await keywordModel.generateContent(promptForKeywords);
            const keywordResponse = await keywordResult.response;
            const keywordText = keywordResponse.text();
            extractedKeywords = keywordText.split(',').map(k => k.trim()).filter(k => k.length > 0);

            // 既存のキーワードを削除してから新しいキーワードを保存する (重複防止)
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM keywords WHERE conversation_id = ?', [conversationId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            const insertPromises = extractedKeywords.map(keyword => {
                return new Promise((resolve, reject) => {
                    db.run('INSERT INTO keywords (conversation_id, keyword) VALUES (?, ?)',
                        [conversationId, keyword], function(err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
            await Promise.all(insertPromises);
            console.log(`Keywords saved for conversation ${conversationId}:`, extractedKeywords);

        } catch (keywordError) {
            console.error('Error extracting or saving keywords:', keywordError);
            // キーワード抽出に失敗しても、要約は返す
        }

        // ★追加: 会話から感情を抽出する Gemini API 呼び出し ★
        let sentimentResult = { overall_sentiment: 'Neutral', positive_score: 0, negative_score: 0, neutral_score: 0 };
        try {
            const promptForSentiment = `以下の1on1の会話履歴を読み、会話全体の感情を分析してください。
            以下のJSON形式で出力してください。感情スコアは0から1の範囲で指定してください。

            ## 1on1会話履歴
            ${formattedMessages}

            ## 出力形式
            {
            "overall_sentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
            "positive_score": 0.0,
            "negative_score": 0.0,
            "neutral_score": 0.0
            }
            `;

            const sentimentModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // またはgemini-1.5-pro
            // ★修正: generateContent は result オブジェクトを返す
            const sentimentResultObj = await sentimentModel.generateContent(promptForSentiment);
            // ★修正: 実際のレスポンステキストは result オブジェクトの response プロパティから取得する
            const sentimentText = sentimentResultObj.response.text();

            const cleanSentimentText = sentimentText.replace(/```json\n|```/g, '').trim(); // '```json' と '```' を削除
            sentimentResult = JSON.parse(cleanSentimentText); // ★修正: クリーンなテキストをパース

            // スコアが数値であることを保証
            sentimentResult.positive_score = parseFloat(sentimentResult.positive_score) || 0;
            sentimentResult.negative_score = parseFloat(sentimentResult.negative_score) || 0;
            sentimentResult.neutral_score = parseFloat(sentimentResult.neutral_score) || 0;


            // 既存の感情データを削除してから新しい感情データを保存する (重複防止)
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM sentiments WHERE conversation_id = ?', [conversationId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // sentiments テーブルに保存
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO sentiments (conversation_id, overall_sentiment, positive_score, negative_score, neutral_score) VALUES (?, ?, ?, ?, ?)',
                    [conversationId, sentimentResult.overall_sentiment, sentimentResult.positive_score, sentimentResult.negative_score, sentimentResult.neutral_score], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log(`Sentiment saved for conversation ${conversationId}:`, sentimentResult.overall_sentiment);

        } catch (sentimentError) {
            console.error('Error extracting or saving sentiment:', sentimentError);
            // 感情抽出に失敗しても、要約は返す
        }

        // データベースに保存
        db.run('UPDATE conversations SET summary = ?, next_actions = ? WHERE id = ?',
            [summary, nextActions, conversationId], function(err) {
            if (err) {
                console.error('Error saving summary and next actions:', err.message);
            }
        });

        // クライアントに生成された内容を返す
        res.json({ summary: summary, nextActions: nextActions, rawContent: generatedContent });

    } catch (error) {
        console.error('Error generating summary or next actions:', error);
        res.status(500).json({ error: 'Failed to generate summary or next actions.' });
    }
});

app.get('/api/dashboard/keywords', authenticateToken, (req, res) => {
    // すべてのキーワードを集計し、頻度順に並べ替える
    db.all(`
        SELECT keyword, COUNT(keyword) as frequency
        FROM keywords
        GROUP BY keyword
        ORDER BY frequency DESC
        LIMIT 10 -- 上位10個のキーワードを取得
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching dashboard keywords:', err.message);
            return res.status(500).json({ error: 'Failed to fetch dashboard keywords.' });
        }
        res.json(rows);
    });
});

// ダッシュボード用の感情推移データを取得するAPIエンドポイント
app.get('/api/dashboard/sentiments', authenticateToken, (req, res) => {
    // 会話と感情データを結合し、時系列順に並べ替える
    db.all(`
        SELECT
            s.overall_sentiment,
            s.positive_score,
            s.negative_score,
            s.neutral_score,
            c.timestamp AS conversation_timestamp
        FROM sentiments s
        JOIN conversations c ON s.conversation_id = c.id
        ORDER BY c.timestamp ASC
        LIMIT 20 -- 最新の20件の会話の感情を取得
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching dashboard sentiments:', err.message);
            return res.status(500).json({ error: 'Failed to fetch dashboard sentiments.' });
        }
        res.json(rows);
    });
});

// 新しい部下を登録するAPIエンドポイント
app.post('/api/employees', authenticateToken, async (req, res) => {
    const { name, email } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Employee name is required.' });
    }

    try {
        const employeeId = await new Promise((resolve, reject) => {
            db.run('INSERT INTO employees (name, email) VALUES (?, ?)', [name, email], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('Employee with this name or email already exists.'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(this.lastID);
                }
            });
        });
        res.status(201).json({ id: employeeId, name, email });
    } catch (error) {
        console.error('Error adding new employee:', error.message);
        res.status(409).json({ error: error.message }); // 衝突エラー
    }
});

// 登録されている部下の一覧を取得するAPIエンドポイント
app.get('/api/employees', authenticateToken, (req, res) => {
    db.all("SELECT id, name, email FROM employees ORDER BY name ASC", [], (err, rows) => {
        if (err) {
            console.error('Error fetching employees:', err.message);
            return res.status(500).json({ error: 'Failed to fetch employees.' });
        }
        res.json(rows);
    });
});

// ユーザー登録API
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(password, 10); // 10はソルトラウンド数

        const userId = await new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('Username already exists.'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(this.lastID);
                }
            });
        });
        res.status(201).json({ message: 'User registered successfully.', userId });
    } catch (error) {
        console.error('Error during user registration:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ユーザーログインAPI
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // パスワードを比較
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // JWT を生成
        // トークンにユーザーのIDとユーザー名を含める
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' }); // トークンの有効期限を1時間に設定

        res.status(200).json({ message: 'Logged in successfully.', token, username: user.username, userId: user.id }); // userIdも返す
    } catch (error) {
        console.error('Error during user login:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});