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

# مفتاح Autosiastik Fahrzeugschein-Scanner على السيرفر

نفس المبدأ: المفتاح ما بينحط بالكود ولا بGitHub ولا بـ localStorage. هاد الماسح
(https://api.fahrzeugschein-scanner.de/redoc) هو المصدر الأساسي لقراءة
الفحصة الآن؛ لو السيرفر ما كان فيه مفتاح، البرنامج يرجع تلقائياً لـ OpenAI
(الطريقة القديمة فوق) من دون أي تعديل إضافي.

## مرة واحدة في Supabase

```
supabase functions deploy autosiastik-scan --project-ref jljzobaggesefsdeslrf
supabase secrets set AUTOSIASTIK_ACCESS_KEY=xxxxx --project-ref jljzobaggesefsdeslrf
```

المفتاح يُؤخذ من صفحة الحساب على fahrzeugschein-scanner.de.

بعدها البرنامج يستدعي:

`https://jljzobaggesefsdeslrf.supabase.co/functions/v1/autosiastik-scan`

الصورة تروح للسيرفر، المفتاح يبقى هناك، وما في أي حقل بالواجهة لإدخاله —
هذا مقصود (لا نسخة احتياطية جهاز/متصفح لهذا المفتاح على عكس OpenAI).

## get_kba_data (تعطيل افتراضي)

خانة `get_kba_data` بالـ API (بيانات KBA إضافية) تبقى معطّلة افتراضياً لأنها
ممكن تستهلك رصيد مسح إضافي. لتفعيلها عمداً:

```
supabase secrets set AUTOSIASTIK_ALLOW_KBA=true --project-ref jljzobaggesefsdeslrf
```

وبعدها لازم الطلب نفسه (من التطبيق) يطلبها بوضوح (`getKbaData:true`) — تفعيل
الـ secret لحاله ما بيكفي، لازم الاثنين معاً.
