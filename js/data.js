/*
 * Starter decks. You do NOT need to edit this file to change your cards —
 * use the "Cards" page in the app instead. These are only the defaults that
 * are loaded the first time the app runs on a computer.
 *
 * Card format: [Japanese, reading/romaji, meaning, notes]
 */
(function () {
  'use strict';

  function kana(chars, romaji, notes) {
    return Array.from(chars).map(function (ch, i) {
      return [ch, '', romaji[i], (notes && notes[ch]) || ''];
    });
  }

  var BASIC_ROMAJI = [
    'a', 'i', 'u', 'e', 'o',
    'ka', 'ki', 'ku', 'ke', 'ko',
    'sa', 'shi', 'su', 'se', 'so',
    'ta', 'chi', 'tsu', 'te', 'to',
    'na', 'ni', 'nu', 'ne', 'no',
    'ha', 'hi', 'fu', 'he', 'ho',
    'ma', 'mi', 'mu', 'me', 'mo',
    'ya', 'yu', 'yo',
    'ra', 'ri', 'ru', 're', 'ro',
    'wa', 'wo', 'n'
  ];
  var DAKUTEN_ROMAJI = [
    'ga', 'gi', 'gu', 'ge', 'go',
    'za', 'ji', 'zu', 'ze', 'zo',
    'da', 'ji (dji)', 'zu (dzu)', 'de', 'do',
    'ba', 'bi', 'bu', 'be', 'bo',
    'pa', 'pi', 'pu', 'pe', 'po'
  ];
  var ROMAJI = BASIC_ROMAJI.concat(DAKUTEN_ROMAJI);

  var hiragana = kana(
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' +
    'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ',
    ROMAJI,
    {
      'は': 'Read "wa" when used as the topic particle.',
      'へ': 'Read "e" when used as the direction particle.',
      'を': 'Pronounced "o". Used only as the object particle.',
      'ん': 'The only kana that is a consonant on its own.',
      'ぢ': 'Rare. Sounds the same as じ.',
      'づ': 'Rare. Sounds the same as ず.'
    }
  );

  var katakana = kana(
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
    'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ',
    ROMAJI,
    {
      'ヲ': 'Very rarely used in katakana.',
      'ン': 'Looks like ソ (so). ン strokes go up and to the right.',
      'ソ': 'Looks like ン (n). ソ strokes go down.',
      'シ': 'Looks like ツ (tsu). シ strokes are more horizontal.',
      'ツ': 'Looks like シ (shi). ツ strokes are more vertical.'
    }
  ).concat([['ー', '', 'long vowel mark', 'Makes the vowel before it longer, e.g. コーヒー (koohii, coffee).']]);

  window.DEFAULT_DECKS = [
    {
      id: 'hiragana',
      name: 'Hiragana',
      description: 'The basic Japanese alphabet, plus the dakuten forms (が, ぱ…).',
      cards: hiragana
    },
    {
      id: 'katakana',
      name: 'Katakana',
      description: 'The alphabet used for foreign words and names.',
      cards: katakana
    },
    {
      id: 'greetings',
      name: 'Greetings & Phrases',
      description: 'Everyday phrases you will hear and use constantly.',
      cards: [
        ['こんにちは', 'konnichiwa', 'Hello / Good afternoon', ''],
        ['おはようございます', 'ohayou gozaimasu', 'Good morning (polite)', 'Casual: おはよう'],
        ['こんばんは', 'konbanwa', 'Good evening', ''],
        ['さようなら', 'sayounara', 'Goodbye', 'Sounds quite final. Friends usually say じゃあね (jaa ne).'],
        ['おやすみなさい', 'oyasuminasai', 'Good night', 'Casual: おやすみ'],
        ['ありがとうございます', 'arigatou gozaimasu', 'Thank you (polite)', 'Casual: ありがとう'],
        ['すみません', 'sumimasen', 'Excuse me / Sorry', 'Also used to get someone\'s attention.'],
        ['ごめんなさい', 'gomennasai', 'I\'m sorry', ''],
        ['はい', 'hai', 'Yes', ''],
        ['いいえ', 'iie', 'No', ''],
        ['お願いします', 'おねがいします · onegaishimasu', 'Please (when asking for something)', ''],
        ['いただきます', 'itadakimasu', 'Said before eating', ''],
        ['ごちそうさまでした', 'gochisousama deshita', 'Said after eating', 'Thanks for the meal.'],
        ['はじめまして', 'hajimemashite', 'Nice to meet you', 'Said only when meeting someone for the first time.'],
        ['よろしくお願いします', 'よろしくおねがいします · yoroshiku onegaishimasu', 'Pleased to meet you / I appreciate your help', ''],
        ['お元気ですか', 'おげんきですか · ogenki desu ka', 'How are you?', ''],
        ['元気です', 'げんきです · genki desu', 'I\'m fine', ''],
        ['分かりません', 'わかりません · wakarimasen', 'I don\'t understand', ''],
        ['もう一度お願いします', 'もういちどおねがいします · mou ichido onegaishimasu', 'One more time, please', ''],
        ['いくらですか', 'ikura desu ka', 'How much is it?', ''],
        ['トイレはどこですか', 'toire wa doko desu ka', 'Where is the toilet?', ''],
        ['英語を話せますか', 'えいごをはなせますか · eigo o hanasemasu ka', 'Can you speak English?', '']
      ]
    },
    {
      id: 'numbers',
      name: 'Numbers',
      description: 'Counting from zero to ten thousand.',
      cards: [
        ['ゼロ', 'zero', '0', 'Also 零 (れい, rei).'],
        ['一', 'いち · ichi', '1', ''],
        ['二', 'に · ni', '2', ''],
        ['三', 'さん · san', '3', ''],
        ['四', 'よん / し · yon / shi', '4', 'よん is more common; し sounds like "death".'],
        ['五', 'ご · go', '5', ''],
        ['六', 'ろく · roku', '6', ''],
        ['七', 'なな / しち · nana / shichi', '7', ''],
        ['八', 'はち · hachi', '8', ''],
        ['九', 'きゅう / く · kyuu / ku', '9', ''],
        ['十', 'じゅう · juu', '10', '11 = 十一 (juuichi), 20 = 二十 (nijuu)'],
        ['百', 'ひゃく · hyaku', '100', ''],
        ['千', 'せん · sen', '1,000', ''],
        ['万', 'まん · man', '10,000', 'Japanese groups big numbers by 10,000.']
      ]
    },
    {
      id: 'time',
      name: 'Days & Time',
      description: 'Days of the week and time words.',
      cards: [
        ['月曜日', 'げつようび · getsuyoubi', 'Monday', 'Moon day'],
        ['火曜日', 'かようび · kayoubi', 'Tuesday', 'Fire day'],
        ['水曜日', 'すいようび · suiyoubi', 'Wednesday', 'Water day'],
        ['木曜日', 'もくようび · mokuyoubi', 'Thursday', 'Tree day'],
        ['金曜日', 'きんようび · kin\'youbi', 'Friday', 'Gold day'],
        ['土曜日', 'どようび · doyoubi', 'Saturday', 'Earth day'],
        ['日曜日', 'にちようび · nichiyoubi', 'Sunday', 'Sun day'],
        ['今日', 'きょう · kyou', 'today', ''],
        ['明日', 'あした · ashita', 'tomorrow', ''],
        ['昨日', 'きのう · kinou', 'yesterday', ''],
        ['今', 'いま · ima', 'now', ''],
        ['朝', 'あさ · asa', 'morning', ''],
        ['夜', 'よる · yoru', 'night', ''],
        ['時間', 'じかん · jikan', 'time / hours', ''],
        ['週末', 'しゅうまつ · shuumatsu', 'weekend', '']
      ]
    },
    {
      id: 'people',
      name: 'People & Family',
      description: 'Pronouns, family members and people.',
      cards: [
        ['私', 'わたし · watashi', 'I / me', ''],
        ['あなた', 'anata', 'you', 'Often avoided; Japanese speakers usually use the person\'s name.'],
        ['友達', 'ともだち · tomodachi', 'friend', ''],
        ['家族', 'かぞく · kazoku', 'family', ''],
        ['父', 'ちち · chichi', '(my) father', 'Someone else\'s father: お父さん (otousan)'],
        ['母', 'はは · haha', '(my) mother', 'Someone else\'s mother: お母さん (okaasan)'],
        ['兄', 'あに · ani', '(my) older brother', ''],
        ['姉', 'あね · ane', '(my) older sister', ''],
        ['弟', 'おとうと · otouto', 'younger brother', ''],
        ['妹', 'いもうと · imouto', 'younger sister', ''],
        ['先生', 'せんせい · sensei', 'teacher', ''],
        ['学生', 'がくせい · gakusei', 'student', ''],
        ['人', 'ひと · hito', 'person', ''],
        ['子供', 'こども · kodomo', 'child', '']
      ]
    },
    {
      id: 'food',
      name: 'Food & Drink',
      description: 'Things to eat and drink.',
      cards: [
        ['水', 'みず · mizu', 'water', ''],
        ['お茶', 'おちゃ · ocha', 'tea (green tea)', ''],
        ['コーヒー', 'koohii', 'coffee', ''],
        ['ご飯', 'ごはん · gohan', 'cooked rice / meal', ''],
        ['パン', 'pan', 'bread', ''],
        ['肉', 'にく · niku', 'meat', ''],
        ['魚', 'さかな · sakana', 'fish', ''],
        ['野菜', 'やさい · yasai', 'vegetables', ''],
        ['果物', 'くだもの · kudamono', 'fruit', ''],
        ['卵', 'たまご · tamago', 'egg', ''],
        ['寿司', 'すし · sushi', 'sushi', ''],
        ['ラーメン', 'raamen', 'ramen', ''],
        ['美味しい', 'おいしい · oishii', 'delicious', 'Usually written in hiragana: おいしい']
      ]
    },
    {
      id: 'verbs',
      name: 'Common Verbs',
      description: 'Everyday verbs in dictionary form.',
      cards: [
        ['食べる', 'たべる · taberu', 'to eat', ''],
        ['飲む', 'のむ · nomu', 'to drink', ''],
        ['行く', 'いく · iku', 'to go', ''],
        ['来る', 'くる · kuru', 'to come', 'Irregular verb.'],
        ['帰る', 'かえる · kaeru', 'to go home / return', ''],
        ['見る', 'みる · miru', 'to see / watch', ''],
        ['聞く', 'きく · kiku', 'to listen / to ask', ''],
        ['話す', 'はなす · hanasu', 'to speak', ''],
        ['読む', 'よむ · yomu', 'to read', ''],
        ['書く', 'かく · kaku', 'to write', ''],
        ['する', 'suru', 'to do', 'Irregular verb.'],
        ['分かる', 'わかる · wakaru', 'to understand', ''],
        ['買う', 'かう · kau', 'to buy', ''],
        ['寝る', 'ねる · neru', 'to sleep', ''],
        ['起きる', 'おきる · okiru', 'to wake up / get up', ''],
        ['勉強する', 'べんきょうする · benkyou suru', 'to study', ''],
        ['待つ', 'まつ · matsu', 'to wait', ''],
        ['会う', 'あう · au', 'to meet', '']
      ]
    },
    {
      id: 'adjectives',
      name: 'Adjectives',
      description: 'Describing words (い- and な-adjectives).',
      cards: [
        ['大きい', 'おおきい · ookii', 'big', ''],
        ['小さい', 'ちいさい · chiisai', 'small', ''],
        ['新しい', 'あたらしい · atarashii', 'new', ''],
        ['古い', 'ふるい · furui', 'old (for things)', ''],
        ['高い', 'たかい · takai', 'expensive / tall', ''],
        ['安い', 'やすい · yasui', 'cheap', ''],
        ['暑い', 'あつい · atsui', 'hot (weather)', ''],
        ['寒い', 'さむい · samui', 'cold (weather)', ''],
        ['いい', 'ii', 'good', 'Also written 良い (yoi).'],
        ['悪い', 'わるい · warui', 'bad', ''],
        ['楽しい', 'たのしい · tanoshii', 'fun / enjoyable', ''],
        ['難しい', 'むずかしい · muzukashii', 'difficult', ''],
        ['簡単', 'かんたん · kantan', 'easy / simple', 'な-adjective'],
        ['好き', 'すき · suki', 'liked / to like', 'な-adjective. 猫が好きです = I like cats.'],
        ['元気', 'げんき · genki', 'healthy / energetic', 'な-adjective'],
        ['きれい', 'kirei', 'pretty / clean', 'な-adjective, even though it ends in い.']
      ]
    },
    {
      id: 'places',
      name: 'Places & Things',
      description: 'Common places and objects.',
      cards: [
        ['家', 'いえ · ie', 'house / home', ''],
        ['学校', 'がっこう · gakkou', 'school', ''],
        ['駅', 'えき · eki', 'station', ''],
        ['店', 'みせ · mise', 'shop / store', ''],
        ['会社', 'かいしゃ · kaisha', 'company / office', ''],
        ['病院', 'びょういん · byouin', 'hospital', ''],
        ['本', 'ほん · hon', 'book', ''],
        ['車', 'くるま · kuruma', 'car', ''],
        ['電車', 'でんしゃ · densha', 'train', ''],
        ['電話', 'でんわ · denwa', 'telephone', ''],
        ['日本', 'にほん · nihon', 'Japan', ''],
        ['日本語', 'にほんご · nihongo', 'Japanese (language)', ''],
        ['英語', 'えいご · eigo', 'English (language)', '']
      ]
    },
    {
      id: 'questions',
      name: 'Question Words',
      description: 'Who, what, where, when, why and how.',
      cards: [
        ['何', 'なに / なん · nani / nan', 'what', ''],
        ['誰', 'だれ · dare', 'who', ''],
        ['どこ', 'doko', 'where', ''],
        ['いつ', 'itsu', 'when', ''],
        ['どうして', 'doushite', 'why', 'More formal: なぜ (naze)'],
        ['どう', 'dou', 'how', ''],
        ['どれ', 'dore', 'which one', ''],
        ['いくら', 'ikura', 'how much (price)', '']
      ]
    },
    {
      id: 'kanji',
      name: 'Basic Kanji',
      description: 'Beginner kanji with their on (Chinese) and kun (Japanese) readings.',
      cards: [
        ['日', 'on: ニチ, ジツ · kun: ひ, か', 'sun / day', ''],
        ['月', 'on: ゲツ, ガツ · kun: つき', 'moon / month', ''],
        ['火', 'on: カ · kun: ひ', 'fire', ''],
        ['水', 'on: スイ · kun: みず', 'water', ''],
        ['木', 'on: モク, ボク · kun: き', 'tree / wood', ''],
        ['金', 'on: キン, コン · kun: かね', 'gold / money', ''],
        ['土', 'on: ド, ト · kun: つち', 'earth / soil', ''],
        ['山', 'on: サン · kun: やま', 'mountain', ''],
        ['川', 'on: セン · kun: かわ', 'river', ''],
        ['人', 'on: ジン, ニン · kun: ひと', 'person', ''],
        ['口', 'on: コウ, ク · kun: くち', 'mouth', ''],
        ['目', 'on: モク · kun: め', 'eye', ''],
        ['手', 'on: シュ · kun: て', 'hand', ''],
        ['大', 'on: ダイ, タイ · kun: おお(きい)', 'big', ''],
        ['小', 'on: ショウ · kun: ちい(さい), こ', 'small', ''],
        ['上', 'on: ジョウ · kun: うえ, あ(がる)', 'up / above', ''],
        ['下', 'on: カ, ゲ · kun: した, さ(がる)', 'down / below', ''],
        ['中', 'on: チュウ · kun: なか', 'middle / inside', ''],
        ['年', 'on: ネン · kun: とし', 'year', ''],
        ['学', 'on: ガク · kun: まな(ぶ)', 'study / learning', ''],
        ['生', 'on: セイ, ショウ · kun: い(きる), う(まれる)', 'life / birth', ''],
        ['先', 'on: セン · kun: さき', 'ahead / previous', ''],
        ['本', 'on: ホン · kun: もと', 'book / origin', ''],
        ['円', 'on: エン · kun: まる(い)', 'yen / circle', '']
      ]
    }
  ];
})();
