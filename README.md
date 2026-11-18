# 日本語 Flashcards

A Japanese flashcard app that runs in your web browser.

- **300 starter cards** in 12 decks: Hiragana, Katakana, Greetings & Phrases, Numbers, Days & Time, People & Family, Food & Drink, Common Verbs, Adjectives, Places & Things, Question Words, and Basic Kanji.
- **Spaced repetition.** After each card, rate it *Again / Hard / Good / Easy*. Cards you know well come back less and less often, and cards you miss come back soon.
- **Edit your cards in the app** (the **Cards** tab). You can add, edit, delete, move cards between decks, create your own decks, or paste a whole list of cards at once with **Bulk add**. You never need to touch the code.
- **Progress saves automatically** in your browser.
- **Progress codes:** copy a short code or link, then paste it on another computer to continue where you left off. No account needed.
- **Where you left off:** the home page shows what you studied last and has a **Continue** button.
- **Automatic sync between computers** through a private GitHub Gist (see below).
- Also includes: Japanese text-to-speech 🔊, Japanese→English, English→Japanese or mixed cards, a daily streak, backup/restore to a file, dark mode, and phone-friendly layout.

Keyboard shortcuts while studying: **Space** flips the card, **1–4** rates it, **Space** again = Good, and **P** plays the audio.

## Put it online (free, with GitHub Pages)

1. On GitHub, open this repository and go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**. Pick the branch with these files (for example `main`) and the folder **/ (root)**, then click **Save**.
3. Wait about a minute. Your app will be at `https://<your-username>.github.io/<repository-name>/`. Bookmark it on every computer.

> GitHub Pages on a free account requires the repository to be **public**. The app code is public, but your cards and progress are **not** stored in the repository. They're stored in your browser and in your private sync gist.

You can also just double-click `index.html` to use it offline on one computer.

## Move your progress with a code (no account needed)

1. On the computer you studied on, click **Get my progress code** (at the bottom of the home page or in **Settings**).
2. Click **Copy code**, or **Copy link** if the app is online. Send it to yourself, for example in an email or a note.
3. On the other computer, open the app and click **Paste a code**, or just open the link.
4. The app shows what the code contains: cards studied, mastered, due, your streak, and where you left off. Click **Load this progress**.

A code is a snapshot of that moment. After you study again, get a fresh code. If you'd rather not copy codes back and forth, turn on sync instead.

## Sync across computers (automatic)

Your progress is saved in each browser. To share it between computers:

1. In the app, open **Settings → Sync across computers**.
2. Click the link to create a GitHub token. The link already selects the **gist** permission. Choose an expiration and click **Generate token**.
3. Copy the token (it starts with `ghp_`), paste it into the app, and click **Connect**.
4. On each other computer, open the app and paste the same token (or a new one from the same GitHub account).

Already set up sync on one computer? In **Settings → Sync**, click **Get a setup link for another computer**. Opening that link on the other computer turns sync on there with one click. The link contains your token, so treat it like a password.

After that, changes sync on their own a few seconds after you make them, and again whenever you return to the tab. The data is kept in a secret gist named `japanese-flashcards-data.json` in your GitHub account. If two computers change the same card, the most recent change wins.

The token is saved only in that browser. Anyone who has it can edit your gists, so don't share it. If you lose a computer, delete the token at https://github.com/settings/tokens.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `css/style.css` | Styles |
| `js/data.js` | The starter decks (used only the first time; edit cards in the app instead) |
| `js/app.js` | Everything else: studying, card editor, saving, and sync |
