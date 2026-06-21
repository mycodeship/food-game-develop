// -----------------
// バックエンドのURL設定
// -----------------
// Renderなどにバックエンドをデプロイしたら、発行されたURLに書き換えてください。
// 例: "https://gohan-game-backend.onrender.com"
// ローカルでテストする場合は "http://127.0.0.1:8000" のままで構いません。

const API_URL = "https://your-backend.onrender.com";

// -----------------
// キャラクターデータ
// -----------------

const CHARACTERS = [
    {
        name: "ハナ",
        img: "pink.jpg",
        filter: "none",
        speech: "お腹すいた…\n何か食べたいな…",
        startSpeech: "お腹すいた…"
    },
    {
        name: "ユキ",
        img: "blue.jpg",
        filter: "none",
        speech: "寒いな…\nあったかいもの食べたい…",
        startSpeech: "なにかな…"
    },
    {
        name: "アカリ",
        img: "red.jpg",
        filter: "none",
        speech: "もうお腹ペコペコ！\nはやく食べたい！",
        startSpeech: "はやくちょうだい！"
    }
];

let selectedCharIndex = 0;

// -----------------
// 状態管理
// -----------------

let typingInterval = null;
let isTyping = false;

// -----------------
// 音
// -----------------

const typeSound = new Audio("type.mp3");

typeSound.volume = 0.5;
typeSound.loop = true;

// -----------------
// ハイスコア(ブラウザ保存)
// -----------------
// サーバー側のデータベースは使わず、このブラウザのlocalStorageに
// 自己ベストスコアを保存します。他の人とは共有されません。

const BEST_SCORE_KEY = "gohan_game_best_score";

function getBestScore() {
    const saved = localStorage.getItem(BEST_SCORE_KEY);
    return saved ? parseInt(saved, 10) : 0;
}

function saveBestScoreIfNeeded(score) {
    const current = getBestScore();
    if (score > current) {
        localStorage.setItem(BEST_SCORE_KEY, String(score));
        return true;
    }
    return false;
}

// -----------------
// キャラクター選択
// -----------------

function selectChar(index) {
    selectedCharIndex = index;
    const char = CHARACTERS[index];

    // 選択状態を更新
    document.querySelectorAll(".char-option").forEach((btn, i) => {
        btn.classList.toggle("selected", i === index);
    });

    // プレビュー更新
    const previewImg = document.getElementById("start-char-img");
    previewImg.src = char.img;
    previewImg.style.filter = char.filter;
    document.getElementById("start-char-speech").innerHTML =
        char.speech.replace("\n", "<br>");
}

async function startGame() {

    const startScreen = document.getElementById("start-screen");
    const gameScreen  = document.getElementById("game-screen");

    // フェードアウト
    startScreen.style.transition = "opacity 0.4s";
    startScreen.style.opacity = "0";

    await new Promise(r => setTimeout(r, 400));

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    // 選択キャラをゲーム画面に反映
    const char = CHARACTERS[selectedCharIndex];
    const charImg = document.getElementById("character");
    charImg.src = char.img;
    charImg.style.filter = char.filter;
    document.getElementById("speech").innerText = char.startSpeech;

    await loadState();
    loadFoods();

    // 初回クリックで音有効化（ゲーム画面に移ってから）
    document.body.addEventListener("click", () => {
        typeSound.play().then(() => typeSound.pause());
    }, { once: true });

    document.getElementById("speech").onclick = () => {
        if (isTyping) {
            clearInterval(typingInterval);
            typingInterval = null;
            isTyping = false;
            typeSound.pause();
        }
    };

}

window.onload = async() => {

    // スタート画面を表示するだけ（ゲームはstartGame()で開始）

};


// -----------------
// ステータス描画
// -----------------

function renderStatus(hp, fullness, day, score) {

    const hpClamped       = Math.max(0, Math.min(hp, 100));
    const fullnessClamped = Math.max(0, Math.min(fullness, 100));

    // HPの色：高い=緑、中=黄、低=赤
    const hpColor = hpClamped > 50
        ? "#4caf50"
        : hpClamped > 25
        ? "#ff9800"
        : "#e53935";

    const fullnessColor = fullnessClamped > 50
        ? "#42a5f5"
        : fullnessClamped > 20
        ? "#ff9800"
        : "#e53935";

    document.getElementById("status").innerHTML = `
        <div class="status-grid">
            <div class="status-row">
                <span class="status-label">❤️ HP</span>
                <div class="status-bar-wrap">
                    <div class="status-bar-track">
                        <div class="status-bar-fill" style="width:${hpClamped}%;background:${hpColor};" id="bar-hp"></div>
                    </div>
                    <span class="status-val">${hp}</span>
                </div>
            </div>
            <div class="status-row">
                <span class="status-label">🍚 満腹</span>
                <div class="status-bar-wrap">
                    <div class="status-bar-track">
                        <div class="status-bar-fill" style="width:${fullnessClamped}%;background:${fullnessColor};" id="bar-fullness"></div>
                    </div>
                    <span class="status-val">${fullness}</span>
                </div>
            </div>
            <div class="status-meta">
                <span>📅 ${day}日目</span>
                <span>⭐ スコア: ${score}</span>
            </div>
        </div>
    `;

}

// -----------------
// 状態取得
// -----------------

async function loadState() {

    const res = await fetch(`${API_URL}/state`);

    const data = await res.json();

    renderStatus(data.hp, data.fullness, data.day, data.score);

}

// -----------------
// 食べ物取得
// -----------------

async function loadFoods() {

    const res = await fetch(`${API_URL}/foods`);

    const data = await res.json();

    const choicesDiv =
        document.getElementById("choices");

    choicesDiv.innerHTML = "";

    data.choices.forEach(food => {

        const btn =
            document.createElement("button");

        btn.innerText = food;

        btn.onclick = () => chooseFood(food);

        choicesDiv.appendChild(btn);

    });

}

// -----------------
// 食べる
// -----------------

async function chooseFood(food) {

    // 食べる音
    const eatSound = new Audio("eat.mp3");

    eatSound.volume = 0.2;

    eatSound.play().catch(() => {});

    // API
    const res = await fetch(`${API_URL}/choose`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            food,
            character: CHARACTERS[selectedCharIndex].name
        })

    });

    const data = await res.json();

    if (!data.state) return;

    renderStatus(data.state.hp, data.state.fullness, data.state.day, data.state.score);

    // AIセリフ
    typeText(
        document.getElementById("speech"),
        data.comment
    );

    // -----------------
    // 生存
    // -----------------

    if (data.state.alive) {

        loadFoods();

    } else {

        // ゲームオーバー表示
        document.getElementById("choices").innerHTML =
            '<div class="gameover-banner">💀 ゲームオーバー</div>';

        typeSound.pause();

        typeSound.currentTime = 0;

        // -----------------
        // 自己ベスト確認・保存(ブラウザのlocalStorageを使用)
        // -----------------

        const isNewBest = saveBestScoreIfNeeded(data.state.score);

        // -----------------
        // 表示
        // -----------------

        if (isNewBest) {

            showToast("🏆 自己ベスト更新！");

        } else {

            document.getElementById("speech").innerText =
                "……もうだめ…";

        }

    }

}

// -----------------
// リセット
// -----------------

async function resetGame() {

    await fetch(`${API_URL}/reset`, {

        method: "POST"

    });

    typeSound.pause();

    typeSound.currentTime = 0;

    const char = CHARACTERS[selectedCharIndex];
    document.getElementById("speech").innerText = "もう一回やる…？";

    await loadState();
    loadFoods();

}

// -----------------
// タイピング演出
// -----------------

function typeText(element, text, speed = 50) {

    if (!text) return;

    if (typingInterval) {

        clearInterval(typingInterval);

    }

    element.innerText = "";

    let i = 0;

    // 開始
    isTyping = true;

    typeSound.currentTime = 0;

    typeSound.play().catch(() => {});

    typingInterval = setInterval(() => {

        element.innerText += text[i];

        i++;

        if (i >= text.length) {

            clearInterval(typingInterval);

            typingInterval = null;

            isTyping = false;

            typeSound.pause();

            typeSound.currentTime = 0;

        }

    }, speed);

}

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.innerText = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}
