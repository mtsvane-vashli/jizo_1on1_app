const nodemailer = require('nodemailer');

const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
    RESET_EMAIL_FROM
} = process.env;

const isEmailConfigured = Boolean(SMTP_HOST && SMTP_PORT && RESET_EMAIL_FROM);
let transporter;

const getTransporter = () => {
    if (!isEmailConfigured) {
        throw new Error('SMTP configuration is incomplete.');
    }
    if (!transporter) {
        const port = Number(SMTP_PORT);
        const secure = typeof SMTP_SECURE === 'string'
            ? SMTP_SECURE.toLowerCase() === 'true'
            : port === 465;
        const auth = (SMTP_USER && SMTP_PASS) ? { user: SMTP_USER, pass: SMTP_PASS } : undefined;

        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port,
            secure,
            auth
        });
    }
    return transporter;
};

const sendPasswordResetEmail = async ({ to, resetUrl, token }) => {
    if (!isEmailConfigured) {
        console.warn('[email] SMTP settings are missing. Password reset token was generated but not emailed.');
        console.warn(`[email] Token for ${to}: ${token}`);
        return { delivered: false, previewToken: token };
    }

    const message = {
        from: RESET_EMAIL_FROM,
        to,
        subject: '【地蔵1on1】パスワードリセットのご案内',
        text: `パスワードリセットのリクエストを受け付けました。\n以下のURLにアクセスし、新しいパスワードを設定してください。\n\n${resetUrl}\n\nこのリンクの有効期限は1時間です。心当たりがない場合はこのメールを破棄してください。`,
        html: `
            <p>パスワードリセットのリクエストを受け付けました。</p>
            <p>以下のボタンから新しいパスワードを設定してください。（リンクの有効期限は1時間です）</p>
            <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;border-radius:6px;text-decoration:none;">パスワードをリセットする</a></p>
            <p>リンクが開けない場合は、以下のURLをブラウザにコピーしてアクセスしてください。</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>心当たりがない場合はこのメールを破棄してください。</p>
        `
    };

    await getTransporter().sendMail(message);
    return { delivered: true };
};

module.exports = {
    sendPasswordResetEmail,
    isEmailConfigured
};
