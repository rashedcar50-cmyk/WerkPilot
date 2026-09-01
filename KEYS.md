# مفتاح OpenAI على السيرفر

المفتاح ما بينحط بالكود ولا بGitHub.

## مرة واحدة في Supabase

1. افتح https://supabase.com/dashboard
2. مشروع `jljzobaggesefsdeslrf`
3. Edge Functions → Deploy من المجلد `supabase/functions/schein-ocr`
   أو من الطرفية:

```
supabase functions deploy schein-ocr --project-ref jljzobaggesefsdeslrf
supabase secrets set OPENAI_API_KEY=sk-xxxxx --project-ref jljzobaggesefsdeslrf
```

4. Secrets → `OPENAI_API_KEY` = مفتاح OpenAI

بعدها البرنامج يستدعي:

`https://jljzobaggesefsdeslrf.supabase.co/functions/v1/schein-ocr`

الصورة تروح للسيرفر، المفتاح يبقى هناك.
