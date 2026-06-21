import os
import random

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

# -----------------------
# OpenAI
# -----------------------
# APIキーはコードに直接書かず、環境変数 OPENAI_API_KEY から読み込みます。
# ローカルでは .env ファイルに、Renderなどにデプロイする場合は
# ホスティング先の「Environment Variables」設定に OPENAI_API_KEY を登録してください。

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# -----------------------
# FastAPI
# -----------------------

app = FastAPI()

# フロントエンドを別のドメイン(Netlify/Vercelなど)で公開する場合に備えて
# すべてのオリジンからのアクセスを許可しています。
# 公開後、特定のドメインだけに絞りたい場合は allow_origins を変更してください。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------
# 初期状態
# -----------------------

def create_initial_state():
    return {
        "hp": 100,
        "fullness": 50,
        "alive": True,
        "day": 0,
        "score": 0
    }


state = create_initial_state()

# -----------------------
# 食べ物
# -----------------------

FOODS = {
    "高級ケーキ": {"hp": +50, "fullness": +20},
    "普通のパン": {"hp": +10, "fullness": +10},
    "昨日の残り物": {"hp": +5, "fullness": +5},
    "腐ったスープ": {"hp": -30, "fullness": 0},
    "毒キノコ": {"hp": -80, "fullness": 0},
    "カビパン": {"hp": -25, "fullness": +5},
    "ゴキブリ": {"hp": -60, "fullness": +2},
    "カブトムシ": {"hp": -15, "fullness": -5},
    "ミミズ": {"hp": -20, "fullness": +3},
    "石": {"hp": -15, "fullness": 0},
    "ステーキ": {"hp": +30, "fullness": +25},
    "寿司": {"hp": +40, "fullness": +20},
}

BAD_FOODS = [
    "腐ったスープ",
    "毒キノコ",
    "カビパン",
    "ゴキブリ",
    "カブトムシ",
    "ミミズ",
    "石"
]

NORMAL_FOODS = [
    "普通のパン",
    "昨日の残り物"
]

GOOD_FOODS = [
    "高級ケーキ",
    "ステーキ",
    "寿司"
]

# -----------------------
# キャラクター別ペルソナ
# -----------------------

CHARACTER_PERSONAS = {
    "ハナ": """あなたはハナという少女です。
おとなしくて健気な性格です。
虫や腐ったものを食べると小声で嫌がります。
おいしいものを食べると照れながら喜びます。
「…」をよく使い、ぽつりとした短い言葉で話します。
例：「…おいしい」「…これ、むり」「…ありがと」""",

    "ユキ": """あなたはユキという少女です。
クールで感情を表に出さない性格です。
虫や腐ったものでは嫌がります。
おいしいものでも大げさに喜びません。
短くそっけない言葉で話します。
例：「…まずい」「普通」「悪くない」「これは、ない」""",

    "アカリ": """あなたはアカリという少女です。
元気で感情豊か、リアクションが大きい性格です。
虫や腐ったものを食べると大げさに嫌がります。
おいしいものを食べると全力で喜びます。
「！」をよく使い、テンション高めに話します。
例：「最高！！」「むりむりむり！！」「うまっ！！」"""
}

DEFAULT_PERSONA = CHARACTER_PERSONAS["ハナ"]


# -----------------------
# AIセリフ生成
# -----------------------

def generate_comment(food, character: str = "ハナ"):

    persona = CHARACTER_PERSONAS.get(character, DEFAULT_PERSONA)

    prompt = f"""
{persona}

「{food}」を食べました。

20文字以内で感想を返してください。句読点の「。」は使わないでください。
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content


# -----------------------
# API
# -----------------------

@app.get("/")
def root():
    return {"message": "ok"}


@app.get("/state")
def get_state():
    return state


@app.get("/foods")
def get_foods():

    choices = []

    choices += random.sample(BAD_FOODS, 2)

    r = random.random()

    if r < 0.6:
        choices.append(random.choice(BAD_FOODS))
    elif r < 0.8:
        choices.append(random.choice(NORMAL_FOODS))
    else:
        choices.append(random.choice(GOOD_FOODS))

    choices.append("何も食べない")

    return {"choices": choices}


@app.post("/reset")
def reset_game():

    global state

    state = create_initial_state()

    return {"message": "reset"}


# -----------------------
# Choice
# -----------------------

class Choice(BaseModel):
    food: str
    character: str = "ハナ"


# -----------------------
# 食べる
# -----------------------

@app.post("/choose")
def choose_food(choice: Choice):

    global state

    if not state["alive"]:
        return {"message": "もう動かない..."}

    state["day"] += 1

    # -----------------------
    # 何も食べない
    # -----------------------

    if choice.food == "何も食べない":

        state["fullness"] -= 10
        state["hp"] -= 20

        skip_comments = {
            "ハナ": "今日は…何も食べなかった…",
            "ユキ": "食事、スキップ。",
            "アカリ": "え！？何も食べないの！？"
        }
        comment = skip_comments.get(choice.character, "今日は何も食べなかった…")

    else:

        food_data = FOODS.get(choice.food)

        if not food_data:
            return {"message": "不明な食べ物"}

        state["hp"] += food_data["hp"]
        state["fullness"] += food_data["fullness"]

        # AIセリフ生成
        comment = generate_comment(choice.food, choice.character)

    # -----------------------
    # 満腹制限
    # -----------------------

    state["fullness"] = max(0, min(state["fullness"], 100))

    # -----------------------
    # 空腹ペナルティ
    # -----------------------

    if state["fullness"] <= 20:
        state["hp"] -= 10

    # -----------------------
    # スコア
    # -----------------------

    state["score"] = state["day"] * 10 + state["fullness"]

    # -----------------------
    # 死亡判定
    # -----------------------

    if state["hp"] <= 0:

        state["alive"] = False

        death_comments = {
            "ハナ": f"{state['day']}日目に…力尽きた…",
            "ユキ": f"{state['day']}日目。限界、みたい。",
            "アカリ": f"うそ！{state['day']}日目でやられた！？"
        }
        comment = death_comments.get(choice.character, f"{state['day']}日目に力尽きた…")

    return {
        "state": state,
        "comment": comment
    }


# ハイスコアの保存・取得はサーバー側のデータベースを使わず、
# フロントエンド側でブラウザのlocalStorageに保存する方式に変更しました。
# (/best_score, /save_score エンドポイントは削除しています)
