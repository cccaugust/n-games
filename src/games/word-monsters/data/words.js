// 英単語データ（小学〜中学1年でよく使う基礎語）
// en: 英語 / ja: 日本語の意味 / cat: カテゴリID / ex: 例文 / exJa: 例文の意味
// rarity: 'N'(コモン) | 'R'(レア) | 'SR'(スーパーレア) | 'UR'(ウルトラレア) 省略時はN
// arche: モンスターの形（省略時はカテゴリやハッシュで自動決定）

export const CATEGORIES = [
  { id: 'animals',    name: 'どうぶつ',     emoji: '🐾', color: '#f59e0b' },
  { id: 'food',       name: 'たべもの',     emoji: '🍎', color: '#ef4444' },
  { id: 'colors',     name: 'いろ',         emoji: '🎨', color: '#8b5cf6' },
  { id: 'numbers',    name: 'かず',         emoji: '🔢', color: '#06b6d4' },
  { id: 'body',       name: 'からだ',       emoji: '🖐️', color: '#ec4899' },
  { id: 'school',     name: 'がっこう',     emoji: '🏫', color: '#3b82f6' },
  { id: 'family',     name: 'いえ・かぞく', emoji: '🏠', color: '#10b981' },
  { id: 'nature',     name: 'しぜん・天気', emoji: '🌳', color: '#22c55e' },
  { id: 'time',       name: '曜日・月',     emoji: '📅', color: '#f97316' },
  { id: 'verbs',      name: 'うごき',       emoji: '🏃', color: '#6366f1' },
  { id: 'adjectives', name: 'ようす',       emoji: '✨', color: '#eab308' },
  { id: 'sports',     name: 'スポーツ',     emoji: '⚽', color: '#14b8a6' },
];

export const WORDS = [
  // ===== どうぶつ =====
  { en: 'cat',     ja: 'ねこ',       cat: 'animals', arche: 'beast', ex: 'I have a cat.',          exJa: 'わたしはねこをかっています。' },
  { en: 'dog',     ja: 'いぬ',       cat: 'animals', arche: 'beast', ex: 'The dog is big.',         exJa: 'そのいぬは大きい。' },
  { en: 'bird',    ja: 'とり',       cat: 'animals', arche: 'bird',  ex: 'A bird can fly.',         exJa: 'とりはとべる。' },
  { en: 'fish',    ja: 'さかな',     cat: 'animals', arche: 'fish',  ex: 'I like fish.',            exJa: 'わたしはさかなが好き。' },
  { en: 'rabbit',  ja: 'うさぎ',     cat: 'animals', arche: 'beast', ex: 'The rabbit is fast.',     exJa: 'うさぎは速い。', rarity: 'R' },
  { en: 'lion',    ja: 'ライオン',   cat: 'animals', arche: 'beast', ex: 'The lion is strong.',     exJa: 'ライオンは強い。', rarity: 'SR' },
  { en: 'tiger',   ja: 'トラ',       cat: 'animals', arche: 'beast', ex: 'A tiger lives in Asia.',  exJa: 'トラはアジアにすむ。', rarity: 'SR' },
  { en: 'bear',    ja: 'くま',       cat: 'animals', arche: 'beast', ex: 'The bear is sleeping.',   exJa: 'くまはねむっている。', rarity: 'R' },
  { en: 'elephant',ja: 'ぞう',       cat: 'animals', arche: 'beast', ex: 'An elephant is huge.',    exJa: 'ぞうはとても大きい。', rarity: 'SR' },
  { en: 'monkey',  ja: 'さる',       cat: 'animals', arche: 'beast', ex: 'The monkey eats a banana.', exJa: 'さるはバナナを食べる。' },
  { en: 'frog',    ja: 'カエル',     cat: 'animals', arche: 'slime', ex: 'The frog jumps high.',    exJa: 'カエルは高くとぶ。' },
  { en: 'snake',   ja: 'へび',       cat: 'animals', arche: 'snake', ex: 'A snake is long.',        exJa: 'へびは長い。', rarity: 'R' },
  { en: 'horse',   ja: 'うま',       cat: 'animals', arche: 'beast', ex: 'I can ride a horse.',     exJa: 'わたしはうまに乗れる。' },
  { en: 'dragon',  ja: 'ドラゴン',   cat: 'animals', arche: 'dragon',ex: 'The dragon breathes fire.', exJa: 'ドラゴンは火をはく。', rarity: 'UR' },

  // ===== たべもの =====
  { en: 'apple',   ja: 'りんご',     cat: 'food', arche: 'fluff', ex: 'I eat an apple.',          exJa: 'わたしはりんごを食べる。' },
  { en: 'bread',   ja: 'パン',       cat: 'food', arche: 'fluff', ex: 'I want some bread.',       exJa: 'パンがほしい。' },
  { en: 'milk',    ja: 'ぎゅうにゅう', cat: 'food', arche: 'slime', ex: 'Drink your milk.',         exJa: 'ぎゅうにゅうを飲みなさい。' },
  { en: 'egg',     ja: 'たまご',     cat: 'food', arche: 'fluff', ex: 'I cook an egg.',           exJa: 'わたしはたまごを料理する。' },
  { en: 'rice',    ja: 'ごはん・米', cat: 'food', arche: 'slime', ex: 'We eat rice.',             exJa: 'わたしたちはごはんを食べる。' },
  { en: 'water',   ja: '水',         cat: 'food', arche: 'slime', ex: 'I drink water.',           exJa: 'わたしは水を飲む。' },
  { en: 'cake',    ja: 'ケーキ',     cat: 'food', arche: 'fluff', ex: 'This cake is sweet.',      exJa: 'このケーキはあまい。', rarity: 'R' },
  { en: 'banana',  ja: 'バナナ',     cat: 'food', arche: 'fluff', ex: 'A banana is yellow.',      exJa: 'バナナは黄色い。' },
  { en: 'orange',  ja: 'オレンジ',   cat: 'food', arche: 'fluff', ex: 'I like orange juice.',     exJa: 'オレンジジュースが好き。' },
  { en: 'tea',     ja: 'おちゃ',     cat: 'food', arche: 'slime', ex: 'Mom drinks tea.',          exJa: 'お母さんはおちゃを飲む。' },
  { en: 'meat',    ja: 'にく',       cat: 'food', arche: 'fluff', ex: 'I cook meat.',             exJa: 'わたしはにくを料理する。' },
  { en: 'candy',   ja: 'あめ・キャンディ', cat: 'food', arche: 'fluff', ex: 'The candy is sweet.', exJa: 'そのあめはあまい。', rarity: 'R' },

  // ===== いろ =====
  { en: 'red',     ja: 'あか',       cat: 'colors', arche: 'slime', ex: 'The apple is red.',       exJa: 'りんごはあかい。' },
  { en: 'blue',    ja: 'あお',       cat: 'colors', arche: 'slime', ex: 'The sky is blue.',        exJa: 'そらはあおい。' },
  { en: 'yellow',  ja: 'きいろ',     cat: 'colors', arche: 'slime', ex: 'The sun is yellow.',      exJa: 'たいようはきいろい。' },
  { en: 'green',   ja: 'みどり',     cat: 'colors', arche: 'slime', ex: 'Grass is green.',         exJa: 'くさはみどり色だ。' },
  { en: 'white',   ja: 'しろ',       cat: 'colors', arche: 'fluff', ex: 'Snow is white.',          exJa: 'ゆきはしろい。' },
  { en: 'black',   ja: 'くろ',       cat: 'colors', arche: 'ghost', ex: 'The cat is black.',       exJa: 'そのねこはくろい。' },
  { en: 'pink',    ja: 'ピンク',     cat: 'colors', arche: 'fluff', ex: 'I like pink flowers.',    exJa: 'ピンクの花が好き。' },
  { en: 'purple',  ja: 'むらさき',   cat: 'colors', arche: 'ghost', ex: 'Grapes are purple.',      exJa: 'ぶどうはむらさき色だ。', rarity: 'R' },
  { en: 'gold',    ja: 'きんいろ',   cat: 'colors', arche: 'dragon',ex: 'The crown is gold.',      exJa: 'そのかんむりはきんいろだ。', rarity: 'UR' },

  // ===== かず =====
  { en: 'one',     ja: '1（いち）',  cat: 'numbers', arche: 'robot', ex: 'I have one pen.',         exJa: 'わたしはペンを1本もっている。' },
  { en: 'two',     ja: '2（に）',    cat: 'numbers', arche: 'robot', ex: 'I have two cats.',        exJa: 'わたしはねこを2ひきかっている。' },
  { en: 'three',   ja: '3（さん）',  cat: 'numbers', arche: 'robot', ex: 'Three birds are flying.', exJa: '3わのとりがとんでいる。' },
  { en: 'four',    ja: '4（よん）',  cat: 'numbers', arche: 'robot', ex: 'A car has four wheels.',  exJa: '車にはタイヤが4つある。' },
  { en: 'five',    ja: '5（ご）',    cat: 'numbers', arche: 'robot', ex: 'I have five fingers.',    exJa: 'ゆびは5本ある。' },
  { en: 'ten',     ja: '10（じゅう）', cat: 'numbers', arche: 'robot', ex: 'Count to ten.',          exJa: '10まで数えよう。' },
  { en: 'hundred', ja: '100（ひゃく）', cat: 'numbers', arche: 'golem', ex: 'I have a hundred yen.',  exJa: 'わたしは100円もっている。', rarity: 'R' },

  // ===== からだ =====
  { en: 'head',    ja: 'あたま',     cat: 'body', arche: 'golem', ex: 'Touch your head.',         exJa: 'あたまをさわって。' },
  { en: 'hand',    ja: 'て',         cat: 'body', arche: 'golem', ex: 'Wash your hands.',         exJa: 'てをあらいなさい。' },
  { en: 'eye',     ja: 'め',         cat: 'body', arche: 'slime', ex: 'Close your eyes.',         exJa: 'めをとじて。' },
  { en: 'ear',     ja: 'みみ',       cat: 'body', arche: 'beast', ex: 'Rabbits have long ears.',  exJa: 'うさぎはみみが長い。' },
  { en: 'nose',    ja: 'はな',       cat: 'body', arche: 'fluff', ex: 'My nose is cold.',         exJa: 'わたしのはなはつめたい。' },
  { en: 'mouth',   ja: 'くち',       cat: 'body', arche: 'slime', ex: 'Open your mouth.',         exJa: 'くちをあけて。' },
  { en: 'foot',    ja: 'あし',       cat: 'body', arche: 'golem', ex: 'My foot hurts.',           exJa: 'あしがいたい。' },
  { en: 'hair',    ja: 'かみのけ',   cat: 'body', arche: 'fluff', ex: 'Her hair is long.',        exJa: 'かのじょのかみは長い。' },

  // ===== がっこう =====
  { en: 'pen',     ja: 'ペン',       cat: 'school', arche: 'robot', ex: 'This is my pen.',          exJa: 'これはわたしのペンだ。' },
  { en: 'book',    ja: 'ほん',       cat: 'school', arche: 'golem', ex: 'I read a book.',           exJa: 'わたしはほんを読む。' },
  { en: 'pencil',  ja: 'えんぴつ',   cat: 'school', arche: 'robot', ex: 'I write with a pencil.',   exJa: 'わたしはえんぴつで書く。' },
  { en: 'desk',    ja: 'つくえ',     cat: 'school', arche: 'golem', ex: 'My bag is on the desk.',   exJa: 'わたしのかばんはつくえの上だ。' },
  { en: 'chair',   ja: 'いす',       cat: 'school', arche: 'golem', ex: 'Sit on the chair.',        exJa: 'いすにすわって。' },
  { en: 'bag',     ja: 'かばん',     cat: 'school', arche: 'fluff', ex: 'This bag is heavy.',       exJa: 'このかばんは重い。' },
  { en: 'teacher', ja: 'せんせい',   cat: 'school', arche: 'robot', ex: 'She is my teacher.',       exJa: 'かのじょはわたしのせんせいだ。', rarity: 'R' },
  { en: 'student', ja: 'せいと',     cat: 'school', arche: 'robot', ex: 'I am a student.',          exJa: 'わたしはせいとだ。' },
  { en: 'school',  ja: 'がっこう',   cat: 'school', arche: 'golem', ex: 'I go to school.',          exJa: 'わたしはがっこうへ行く。' },
  { en: 'clock',   ja: 'とけい',     cat: 'school', arche: 'robot', ex: 'Look at the clock.',       exJa: 'とけいを見て。' },

  // ===== いえ・かぞく =====
  { en: 'mother',  ja: 'おかあさん', cat: 'family', arche: 'fluff', ex: 'My mother is kind.',       exJa: 'わたしのおかあさんはやさしい。' },
  { en: 'father',  ja: 'おとうさん', cat: 'family', arche: 'golem', ex: 'My father is tall.',        exJa: 'わたしのおとうさんは背が高い。' },
  { en: 'sister',  ja: 'しまい',     cat: 'family', arche: 'fluff', ex: 'I have a sister.',          exJa: 'わたしにはしまいがいる。' },
  { en: 'brother', ja: 'きょうだい', cat: 'family', arche: 'beast', ex: 'My brother is young.',      exJa: 'わたしのきょうだいは年下だ。' },
  { en: 'baby',    ja: 'あかちゃん', cat: 'family', arche: 'fluff', ex: 'The baby is cute.',         exJa: 'あかちゃんはかわいい。', rarity: 'R' },
  { en: 'house',   ja: 'いえ',       cat: 'family', arche: 'golem', ex: 'This is my house.',         exJa: 'これはわたしのいえだ。' },
  { en: 'room',    ja: 'へや',       cat: 'family', arche: 'golem', ex: 'My room is small.',         exJa: 'わたしのへやは小さい。' },
  { en: 'door',    ja: 'ドア',       cat: 'family', arche: 'golem', ex: 'Open the door.',            exJa: 'ドアをあけて。' },
  { en: 'friend',  ja: 'ともだち',   cat: 'family', arche: 'slime', ex: 'He is my friend.',          exJa: 'かれはわたしのともだちだ。', rarity: 'R' },

  // ===== しぜん・天気 =====
  { en: 'sun',     ja: 'たいよう',   cat: 'nature', arche: 'dragon',ex: 'The sun is hot.',          exJa: 'たいようはあつい。', rarity: 'SR' },
  { en: 'moon',    ja: 'つき',       cat: 'nature', arche: 'ghost', ex: 'The moon is bright.',       exJa: 'つきは明るい。', rarity: 'R' },
  { en: 'star',    ja: 'ほし',       cat: 'nature', arche: 'fluff', ex: 'I see a star.',             exJa: 'ほしが見える。', rarity: 'R' },
  { en: 'sky',     ja: 'そら',       cat: 'nature', arche: 'ghost', ex: 'The sky is blue.',          exJa: 'そらはあおい。' },
  { en: 'sea',     ja: 'うみ',       cat: 'nature', arche: 'slime', ex: 'The sea is large.',         exJa: 'うみは広い。' },
  { en: 'tree',    ja: 'き',         cat: 'nature', arche: 'plant', ex: 'The tree is tall.',         exJa: 'そのきは高い。' },
  { en: 'flower',  ja: 'はな',       cat: 'nature', arche: 'plant', ex: 'A flower is beautiful.',    exJa: 'はなは美しい。' },
  { en: 'rain',    ja: 'あめ',       cat: 'nature', arche: 'slime', ex: 'It is raining.',            exJa: 'あめがふっている。' },
  { en: 'snow',    ja: 'ゆき',       cat: 'nature', arche: 'fluff', ex: 'I like snow.',              exJa: 'わたしはゆきが好き。' },
  { en: 'wind',    ja: 'かぜ',       cat: 'nature', arche: 'ghost', ex: 'The wind is strong.',       exJa: 'かぜが強い。' },
  { en: 'mountain',ja: 'やま',       cat: 'nature', arche: 'golem', ex: 'The mountain is high.',     exJa: 'そのやまは高い。', rarity: 'R' },
  { en: 'river',   ja: 'かわ',       cat: 'nature', arche: 'snake', ex: 'The river is long.',        exJa: 'そのかわは長い。' },

  // ===== 曜日・月 =====
  { en: 'Sunday',  ja: '日曜日',     cat: 'time', arche: 'dragon',ex: 'I play on Sunday.',         exJa: '日曜日にあそぶ。', rarity: 'R' },
  { en: 'Monday',  ja: '月曜日',     cat: 'time', arche: 'ghost', ex: 'School starts on Monday.',  exJa: '月曜日にがっこうが始まる。' },
  { en: 'Friday',  ja: '金曜日',     cat: 'time', arche: 'robot', ex: 'I am happy on Friday.',     exJa: '金曜日はうれしい。' },
  { en: 'today',   ja: 'きょう',     cat: 'time', arche: 'robot', ex: 'Today is sunny.',           exJa: 'きょうは晴れだ。' },
  { en: 'morning', ja: 'あさ',       cat: 'time', arche: 'fluff', ex: 'Good morning!',             exJa: 'おはよう！' },
  { en: 'night',   ja: 'よる',       cat: 'time', arche: 'ghost', ex: 'Good night!',               exJa: 'おやすみ！' },
  { en: 'spring',  ja: 'はる',       cat: 'time', arche: 'plant', ex: 'Spring is warm.',           exJa: 'はるはあたたかい。' },
  { en: 'summer',  ja: 'なつ',       cat: 'time', arche: 'dragon',ex: 'Summer is hot.',            exJa: 'なつはあつい。' },
  { en: 'winter',  ja: 'ふゆ',       cat: 'time', arche: 'fluff', ex: 'Winter is cold.',           exJa: 'ふゆはさむい。' },
  { en: 'year',    ja: 'とし・年',   cat: 'time', arche: 'golem', ex: 'Happy New Year!',           exJa: 'あけましておめでとう！' },

  // ===== うごき（動詞） =====
  { en: 'run',     ja: 'はしる',     cat: 'verbs', arche: 'beast', ex: 'I can run fast.',          exJa: 'わたしは速くはしれる。' },
  { en: 'eat',     ja: 'たべる',     cat: 'verbs', arche: 'slime', ex: 'I eat breakfast.',         exJa: 'わたしはあさごはんを食べる。' },
  { en: 'drink',   ja: 'のむ',       cat: 'verbs', arche: 'slime', ex: 'I drink water.',           exJa: 'わたしは水をのむ。' },
  { en: 'play',    ja: 'あそぶ・する', cat: 'verbs', arche: 'fluff', ex: 'I play soccer.',           exJa: 'わたしはサッカーをする。' },
  { en: 'read',    ja: 'よむ',       cat: 'verbs', arche: 'robot', ex: 'I read every day.',        exJa: 'わたしは毎日よむ。' },
  { en: 'write',   ja: 'かく',       cat: 'verbs', arche: 'robot', ex: 'Write your name.',         exJa: 'なまえをかいて。' },
  { en: 'jump',    ja: 'とぶ・ジャンプ', cat: 'verbs', arche: 'slime', ex: 'Frogs jump high.',        exJa: 'カエルは高くとぶ。' },
  { en: 'sing',    ja: 'うたう',     cat: 'verbs', arche: 'bird',  ex: 'Birds sing in the morning.', exJa: 'とりはあさにうたう。' },
  { en: 'sleep',   ja: 'ねむる',     cat: 'verbs', arche: 'ghost', ex: 'Cats sleep a lot.',        exJa: 'ねこはよくねむる。' },
  { en: 'walk',    ja: 'あるく',     cat: 'verbs', arche: 'beast', ex: 'I walk to school.',        exJa: 'わたしはがっこうへあるく。' },
  { en: 'swim',    ja: 'およぐ',     cat: 'verbs', arche: 'fish',  ex: 'Fish can swim.',           exJa: 'さかなはおよげる。' },
  { en: 'fly',     ja: 'とぶ',       cat: 'verbs', arche: 'bird',  ex: 'Birds can fly.',           exJa: 'とりはとべる。' },

  // ===== ようす（形容詞） =====
  { en: 'big',     ja: '大きい',     cat: 'adjectives', arche: 'golem', ex: 'The dog is big.',       exJa: 'そのいぬは大きい。' },
  { en: 'small',   ja: '小さい',     cat: 'adjectives', arche: 'slime', ex: 'The cat is small.',      exJa: 'そのねこは小さい。' },
  { en: 'happy',   ja: 'うれしい',   cat: 'adjectives', arche: 'fluff', ex: 'I am happy.',            exJa: 'わたしはうれしい。' },
  { en: 'sad',     ja: 'かなしい',   cat: 'adjectives', arche: 'ghost', ex: 'He is sad.',             exJa: 'かれはかなしい。' },
  { en: 'hot',     ja: 'あつい',     cat: 'adjectives', arche: 'dragon',ex: 'It is hot today.',       exJa: 'きょうはあつい。' },
  { en: 'cold',    ja: 'さむい',     cat: 'adjectives', arche: 'fluff', ex: 'It is cold today.',      exJa: 'きょうはさむい。' },
  { en: 'fast',    ja: 'はやい',     cat: 'adjectives', arche: 'beast', ex: 'The car is fast.',       exJa: 'その車ははやい。' },
  { en: 'new',     ja: 'あたらしい', cat: 'adjectives', arche: 'robot', ex: 'I have a new bag.',       exJa: 'わたしはあたらしいかばんをもっている。' },
  { en: 'good',    ja: 'よい',       cat: 'adjectives', arche: 'fluff', ex: 'You are a good boy.',     exJa: 'きみはよい子だ。' },
  { en: 'cute',    ja: 'かわいい',   cat: 'adjectives', arche: 'fluff', ex: 'The baby is cute.',       exJa: 'あかちゃんはかわいい。', rarity: 'R' },
  { en: 'strong',  ja: 'つよい',     cat: 'adjectives', arche: 'beast', ex: 'He is very strong.',      exJa: 'かれはとてもつよい。', rarity: 'R' },

  // ===== スポーツ・あそび =====
  { en: 'soccer',  ja: 'サッカー',   cat: 'sports', arche: 'fluff', ex: 'I like soccer.',           exJa: 'わたしはサッカーが好き。' },
  { en: 'tennis',  ja: 'テニス',     cat: 'sports', arche: 'robot', ex: 'She plays tennis.',        exJa: 'かのじょはテニスをする。' },
  { en: 'ball',    ja: 'ボール',     cat: 'sports', arche: 'slime', ex: 'Throw the ball.',          exJa: 'ボールを投げて。' },
  { en: 'game',    ja: 'ゲーム・試合', cat: 'sports', arche: 'robot', ex: 'Let us play a game.',      exJa: 'ゲームをしよう。' },
  { en: 'swimming',ja: 'すいえい',   cat: 'sports', arche: 'fish',  ex: 'Swimming is fun.',          exJa: 'すいえいは楽しい。' },
  { en: 'running', ja: 'ランニング', cat: 'sports', arche: 'beast', ex: 'Running is good for you.',  exJa: 'ランニングは体によい。' },
  { en: 'team',    ja: 'チーム',     cat: 'sports', arche: 'golem', ex: 'We are a team.',            exJa: 'わたしたちはチームだ。', rarity: 'R' },
  { en: 'winner',  ja: 'しょうしゃ', cat: 'sports', arche: 'dragon',ex: 'You are the winner!',       exJa: 'きみがしょうしゃだ！', rarity: 'SR' },
];

// レア度の見た目情報
export const RARITY = {
  N:  { label: 'コモン',       stars: 1, color: '#9ca3af', glow: 'rgba(156,163,175,.5)' },
  R:  { label: 'レア',         stars: 2, color: '#3b82f6', glow: 'rgba(59,130,246,.6)' },
  SR: { label: 'スーパーレア', stars: 3, color: '#a855f7', glow: 'rgba(168,85,247,.7)' },
  UR: { label: 'ウルトラレア', stars: 4, color: '#f59e0b', glow: 'rgba(245,158,11,.85)' },
};

export function getRarity(word) {
  return RARITY[word.rarity || 'N'];
}
