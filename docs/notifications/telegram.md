## Telegram notifications
1. Open Telegram Bot
https://t.me/BotFather
2. Enter:
/newbot
Set bot's name.
And username of the bot
3. Save the token

    !Telegram-token should start with "bot", for instance: `bot1000000000:AAAAAA_aaaaaaaaa_abcdefghijklmnopq`
4. Next we should find 
    - If the chat is private:
        - send any message to our bot.
        - (A) open https://api.telegram.org/%BOT_TOKEN%/getUpdates?allowed_updates=[%22message%22]
        - We are interested in the last message in the result. If there are many messages in (A), you can find the  latest ones by adding the offset and limit(1 from 100) parameters to the query
        - find the message.chat.id field and save
    - If the chat is a group:
        - Add a bot to the chat.
        - (A) open https://api.telegram.org/%BOT_TOKEN%/getUpdates?allowed_updates=[%22message%22]
        - We are interested in the last message in the result. If there are many messages in (A), you can find the latest ones by adding the offset and limit(1 from 100) parameters to the query
        - find the message.chat.id field and save
        - *by default, the bot does not see messages in the chat. To get messages in the group to appear in getUpdates, you can add @%BOT_USERNAME% to the message
5. Save telegram.token and telegram.chat_id to config


## If you need to restore tokens
1. Open Telegram Bot
https://t.me/BotFather
2. `/mybots` or `/token`
