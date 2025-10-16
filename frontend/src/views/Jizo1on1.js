// src/views/Jizo1on1.js
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import base from './Home.module.css';
import styles from './Jizo1on1.module.css';

// Googleフォーム（必要に応じて差し替え）
const GOOGLE_FORM_URL =
    'https://docs.google.com/forms/d/e/1FAIpQLScNxru5cLDqTqODG9f0o6A51iG5Ewk3nSYksw5XQa_ww-9_Nw/viewform';

export default function Jizo1on1() {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = '1on1コミュニケーション事業｜株式会社メメント';
    }, []);

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const headerOffset = 80;
        const top = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: 'smooth' });
    };

    useEffect(() => {
        const els = document.querySelectorAll('[data-reveal]');
        if (!els.length) return;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add(styles.revealed);
                        io.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    // public/assets の参照
    const A = (p) => process.env.PUBLIC_URL + `/assets/${p}`;

    return (
        <div className={styles.page}>
            {/* ===== Header（Homeと統一） ===== */}
            <header className={base.header}>
                <div className={base.navContainer}>
                    <span className={base.logo}>Memento</span>
                    <nav className={base.nav}>
                        <Link to="/" className={`${base.navLink} ${styles.navUnderline}`}>ホーム</Link>
                        <button onClick={() => scrollToSection('services-list')} className={`${base.navLink} ${styles.navUnderline}`}>提供サービス一覧</button>
                        <button onClick={() => scrollToSection('method')} className={`${base.navLink} ${styles.navUnderline}`}>地蔵1on1メソッド</button>
                        <button onClick={() => scrollToSection('product')} className={`${base.navLink} ${styles.navUnderline}`}>プロダクト</button>
                        <button onClick={() => scrollToSection('flow')} className={`${base.navLink} ${styles.navUnderline}`}>導入フロー</button>
                        <button onClick={() => scrollToSection('docs')} className={`${base.navLink} ${styles.navUnderline}`}>紹介資料</button>
                        <button onClick={() => scrollToSection('form')} className={`${base.navLink} ${styles.navUnderline}`}>お問い合わせ</button>
                        <Link to="/jizo-1on1" className={`${base.navLink} ${base.navLinkJizo}`}>1on1事業</Link>
                    </nav>
                </div>
            </header>

            <main className={styles.main}>
                {/* ===== Hero ===== */}
                <section className={styles.hero}>
                    <div className={styles.heroBg} aria-hidden="true">
                        <span className={`${styles.dot} ${styles.dotA}`} />
                        <span className={`${styles.dot} ${styles.dotB}`} />
                    </div>

                    <div className={`${styles.heroInner} ${styles.maskIn}`} data-reveal>
                        <h1 className={`${styles.title} ${styles.flowStagger}`}>
                            <span>1on1コミュニケーション事業</span>
                        </h1>
                        <p className={`${styles.lead} ${styles.flowStagger}`}>
                            <span>地蔵1on1メソッドで部下が自走する組織へ。</span>
                        </p>

                        <div className={`${styles.ctaRow} ${styles.stagger}`}>
                            <button
                                className={styles.primaryBtn}
                                onClick={() => navigate('/login')}
                                aria-label="ログインページへ移動"
                            >
                                地蔵1on1を始める
                            </button>
                            <Link to="/" className={styles.linkBtn}>ホームへ戻る</Link>
                        </div>
                    </div>
                </section>

                {/* ===== フロント画像2枚 ===== */}
                <section className={styles.section} data-reveal>
                    <div className={`${styles.frontImages} ${styles.stagger}`}>
                        <img src={A('siryou_front1.png')} alt="1on1コミュニケーション事業 紹介イメージ1" className={styles.frontImg} loading="lazy" />
                        <img src={A('siryou_front2.png')} alt="1on1コミュニケーション事業 紹介イメージ2" className={styles.frontImg} loading="lazy" />
                    </div>
                </section>

                {/* ===== 提供サービス一覧 ===== */}
                <section id="services-list" className={styles.section}>
                    <h2 className={`${styles.sectionTitle} ${styles.underlineGrow}`} data-reveal>提供サービス一覧</h2>
                    <div className={styles.card} data-reveal>
                        <ul className={styles.list}>
                            <li>企業向け 1on1 導入支援（制度設計から伴走し、はじめての会社でもすぐに動けるように支援）</li>
                            <li>「地蔵1on1メソッド」の開発・提供（当社オリジナルの1on1メソッド）</li>
                            <li>1on1 サポートAI／チャットボット（現場Q&A・上司/部下の対話を後押しするAIツールを自社開発）</li>
                            <li>管理職向け 1on1 研修・ワークショップ（半日〜1日、ロールプレイ中心で実践的に習得）</li>
                            <li>オンライン/オフライン体験会・コミュニティ運営（福岡発・全国無料体験/交流イベントを定期開催）</li>
                        </ul>
                    </div>
                </section>

                {/* ===== 当社独自の1on1メソッド「地蔵1on1」 （左：アイコン / 右：文章） ===== */}
                <section id="method" className={styles.section}>
                    <div className={`${styles.methodWrap} ${styles.stagger}`} data-reveal>
                        <div className={styles.methodIcon}>
                            <img src={A('icon.svg')} alt="地蔵1on1 アイコン" loading="lazy" />
                        </div>
                        <div className={styles.methodBody}>
                            <h2 className={styles.methodHead}>当社独自の1on1メソッド「地蔵1on1」</h2>
                            <ul className={styles.list}>
                                <li>1on1の8割は聞き手（主に上司）が話しすぎてしまう。</li>
                                <li>アドバイスという名の「聞き手」が気持ちよくなりすぎてしまう。</li>
                                <li>聞き手が苦手（主に部下）に対して何を聞けばよいか分からない。</li>
                                <li>そもそも1on1導入の方法が分からない。</li>
                            </ul>
                            <p className={styles.sectionText}>
                                こうした悩みを解決しながら、1on1のやり方を学べるメソッドを開発しました。聞き手と話し手のお助け役として、1on1をするときに地蔵くんがサポートします。
                            </p>
                        </div>
                    </div>
                </section>

                {/* ===== プロダクト説明 ===== */}
                <section id="product" className={styles.section}>
                    <h2 className={`${styles.sectionTitle} ${styles.underlineGrow}`} data-reveal>
                        おたすけ地蔵くん：1on1を最適化し、チームの成長を加速するAIサポートツール
                    </h2>

                    <div className={styles.productText} data-reveal>
                        <p>
                            社員の成長を促し、チームのエンゲージメントを高める重要な場である1on1。しかし、「何を話せばいいのか分からない」「話が広がらない」「議事録の作成が面倒」といった悩みを抱える方も多いのではないでしょうか。
                        </p>
                        <p>
                            「地蔵1on1」は、そんな課題を解決するために生まれた、1on1に特化したAIサポートツールです。上司の方の「聞く」スキルと心構えを徹底的にサポートすることに焦点を当てており、まるで優秀なファシリテーターが隣にいるような感覚で、質の高い1on1を実現します。
                        </p>

                        <h3 className={styles.smallHead}>地蔵1on1の主な特徴</h3>
                        <ul className={styles.list}>
                            <li>
                                <strong>AIがリアルタイムで会話をサポート：</strong>
                                会話の内容からAIが質問や深掘りのヒントを提案します。話が途切れても、AIが次の一手をアシストするので、スムーズに会話を進められます。
                            </li>
                            <li>
                                <strong>会話の自動文字起こしと要約：</strong>
                                話した内容が自動で文字に起こされ、さらにAIが要点をまとめます。メモを取る手間が省け、会話に集中できます。
                            </li>
                            <li>
                                <strong>メモ＆マインドマップ機能で思考を整理：</strong>
                                議論を可視化する機能も搭載。話しながらアイデアを書き留め、思考の全体像を把握することで、より深い対話につながります。
                            </li>
                        </ul>
                    </div>
                </section>

                {/* ===== 導入フローと取り組み実績 ===== */}
                <section id="flow" className={styles.section}>
                    <h2 className={`${styles.sectionTitle} ${styles.underlineGrow}`} data-reveal>導入フローと取り組み実績</h2>

                    {/* 3ステップのカード（添付の雰囲気に寄せる） */}
                    <div className={`${styles.flowGrid} ${styles.stagger}`} data-reveal>
                        <div className={styles.flowCard}>
                            <div className={styles.flowNo}>1</div>
                            <h3>外部メンター×マネージャー ー1on1</h3>
                            <dl className={styles.flowList}>
                                <dt>目的</dt><dd>マネージャーが経験を獲得</dd>
                                <dt>主なアクション</dt><dd>外部メンターと準備練習で1on1を受けながらコツを学ぶ</dd>
                                <dt>成果イメージ</dt><dd>「地蔵式」1on1の型を理解</dd>
                            </dl>
                        </div>

                        <div className={styles.flowCard}>
                            <div className={styles.flowNo}>2</div>
                            <h3>部下と実践</h3>
                            <dl className={styles.flowList}>
                                <dt>目的</dt><dd>定着の土台づくり</dd>
                                <dt>主なアクション</dt><dd>管理職研修で1on1を実践、メソッド専用ツールでログ・振り返りを共有</dd>
                                <dt>成果イメージ</dt><dd>日常的な1on1の実践と継続的な改善</dd>
                            </dl>
                        </div>

                        <div className={styles.flowCard}>
                            <div className={styles.flowNo}>3</div>
                            <h3>チームへ浸透</h3>
                            <dl className={styles.flowList}>
                                <dt>目的</dt><dd>仕組み化・文化化</dd>
                                <dt>主なアクション</dt><dd>成功事例を共有し標準化</dd>
                                <dt>成果イメージ</dt><dd>組織全体での1on1文化の定着と定着</dd>
                            </dl>
                        </div>
                    </div>

                    <p className={styles.results} data-reveal>
                        福岡県 家具メーカー（売上約300億 従業員150名）：部署ごとの支援（マネージャー30代課長級）<br />
                        福岡県 資材メーカー（売上約700億 従業員300名）：部署ごとの支援（マネージャー30〜40代課長級）<br />
                        福岡県 ソフトウェア販売（従業員5名）：代表へ直接支援（代表→社員へ1on1支援）<br />
                        その他 業種・規模問わず幅広くご利用いただいております。
                    </p>
                </section>

                {/* ===== 紹介資料（PDF：ツールバー非表示） ===== */}
                <section id="docs" className={styles.section}>
                    <h2 className={`${styles.sectionTitle} ${styles.underlineGrow}`} data-reveal>紹介資料</h2>
                    <div className={styles.embed} data-reveal>
                        <iframe
                            // Chrome/Edge等でのツールバー非表示（#toolbar=0 他）
                            src={`${A('siryou1.pdf')}#toolbar=0&navpanes=0&scrollbar=0`}
                            title="紹介資料 siryou1.pdf"
                            className={styles.iframe}
                        />
                    </div>
                    <div className={styles.embed} data-reveal>
                        <iframe
                            src={`${A('siryou2.pdf')}#toolbar=0&navpanes=0&scrollbar=0`}
                            title="紹介資料 siryou2.pdf"
                            className={styles.iframe}
                        />
                    </div>
                </section>

                {/* ===== 無料相談・フリートライアル案内（画像風UI） ===== */}
                <section id="form" className={styles.section}>
                    <div className={`${styles.noticePanel} ${styles.maskIn}`} data-reveal>
                        <div className={styles.noticeHead}>無料相談・フリートライアルのご案内</div>
                        <div className={styles.noticeBody}>
                            <p className={styles.noticeText}>
                                導入にあたって無料相談および1名30分の1on1フリートライアルも実施しています。<br />
                                お気軽にご相談ください。
                            </p>
                            <div className={styles.badgeRow}>
                                <span className={styles.badge}>無料体験をされた方の<strong>92%</strong>が1on1を受けて満足と回答しました！</span>
                            </div>
                        </div>

                        <div className={styles.noticeFoot}>
                            <p>1on1のフリートライアルを現在行っております。<br />詳しくは下記の問い合わせフォームよりご連絡いただけますと幸いです。</p>
                            <a
                                href={GOOGLE_FORM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.primaryBtn}
                            >
                                お問い合わせフォームへ
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <p>&copy; {new Date().getFullYear()} Memento Inc.</p>
            </footer>
        </div>
    );
}
