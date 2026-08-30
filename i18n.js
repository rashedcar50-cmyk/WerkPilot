/* WerkPilot i18n
   UI follows selected language.
   Invoices/print for DE companies stay German. */
window.WP_RTL = ['ar','fa','ur','he','ps','sd','ug','dv','yi'];
window.WP_LANGS = [
['en','English'],['de','Deutsch'],['ar','العربية'],['es','Español'],['fr','Français'],['tr','Türkçe'],['ru','Русский'],
['pl','Polski'],['it','Italiano'],['nl','Nederlands'],['pt','Português'],['uk','Українська'],['fa','فارسی'],
['hi','हिन्दी'],['zh','中文'],['ja','日本語'],['ko','한국어'],['ro','Română'],['cs','Čeština'],['sk','Slovenčina'],
['hu','Magyar'],['el','Ελληνικά'],['sv','Svenska'],['da','Dansk'],['fi','Suomi'],['no','Norsk'],['bg','Български'],
['hr','Hrvatski'],['sr','Српски'],['bs','Bosanski'],['sl','Slovenščina'],['lt','Lietuvių'],['lv','Latviešu'],
['et','Eesti'],['th','ไทย'],['vi','Tiếng Việt'],['id','Bahasa Indonesia'],['ms','Bahasa Melayu'],['fil','Filipino'],
['bn','বাংলা'],['ur','اردو'],['he','עברית'],['sw','Kiswahili'],['am','አማርኛ'],['ha','Hausa'],['yo','Yorùbá'],
['ig','Igbo'],['zu','isiZulu'],['af','Afrikaans'],['sq','Shqip'],['mk','Македонски'],['ka','ქართული'],
['hy','Հայերեն'],['az','Azərbaycan'],['kk','Қазақ'],['uz','Oʻzbek'],['tg','Тоҷикӣ'],['ky','Кыргызча'],
['mn','Монгол'],['ne','नेपाली'],['si','සිංහල'],['ta','தமிழ்'],['te','తెలుగు'],['ml','മലയാളം'],['kn','ಕನ್ನಡ'],
['gu','ગુજરાતી'],['pa','ਪੰਜਾਬੀ'],['mr','मराठी'],['or','ଓଡ଼ିଆ'],['my','မြန်မာ'],['km','ខ្មែរ'],['lo','ລາວ'],
['ka','ქართული'],['eu','Euskara'],['ca','Català'],['gl','Galego'],['cy','Cymraeg'],['ga','Gaeilge'],['is','Íslenska'],
['mt','Malti'],['lb','Lëtzebuergesch'],['be','Беларуская'],['mo','Moldovenească'],['kmr','Kurdî'],['ku','کوردی'],
['ps','پښتو'],['so','Soomaali'],['rw','Kinyarwanda'],['ny','Chichewa'],['sn','ChiShona'],['xh','isiXhosa'],
['st','Sesotho'],['tn','Setswana'],['mg','Malagasy'],['mi','Māori'],['sm','Samoan'],['to','Lea faka-Tonga'],
['ty','Reo Tahiti'],['haw','ʻŌlelo Hawaiʻi'],['gn','Guaraní'],['qu','Runasimi'],['ay','Aymar'],['eo','Esperanto']
];

window.WP_I18N = {
en:{app:'BayMeister',tag:'WERKSTATT. DIGITAL. EFFIZIENT.',user:'Username',pass:'Password',login:'Sign in',logout:'Logout',
dash:'Today',customers:'Customers',vehicles:'Vehicles',repairs:'Repair orders',appointments:'Appointments',
estimates:'Quotes',invoices:'Invoices & cash sale',purchases:'Purchases',inventory:'Inventory & parts',
employees:'Staff & payroll',expenses:'Expenses',journal:'Journal',reports:'Reports',integrations:'Integrations',
audit:'Activity log',settings:'Settings',search:'Search: plate / customer / part / job',
save:'Save',cancel:'Cancel',print:'Print',pdf:'PDF',email:'Email',whatsapp:'WhatsApp',
newCustomer:'New customer',newVehicle:'Add vehicle',newRepair:'New repair order',newAppt:'New appointment',
font:'Font size',language:'Program language',hourly:'Labor hourly rate €',phone:'Workshop / WhatsApp phone',
invoiceNote:'Invoices stay in German when the active company is in Germany.',
saved:'Saved',backup:'Export backup',sync:'Sync from cloud',reset:'Reset demo data'},
de:{app:'BayMeister',tag:'WERKSTATT. DIGITAL. EFFIZIENT.',user:'Benutzername',pass:'Passwort',login:'Anmelden',logout:'Abmelden',
dash:'Heute',customers:'Kunden',vehicles:'Fahrzeuge',repairs:'Reparaturaufträge',appointments:'Termine',
estimates:'Kostenvoranschläge',invoices:'Rechnungen & Barverkauf',purchases:'Einkäufe',inventory:'Lager & Teile',
employees:'Mitarbeiter & Lohn',expenses:'Ausgaben',journal:'Journal',reports:'Berichte',integrations:'Integrationen',
audit:'Aktivitätsprotokoll',settings:'Einstellungen',search:'Suche: Kennzeichen / Kunde / Teil / Auftrag',
save:'Speichern',cancel:'Abbrechen',print:'Drucken',pdf:'PDF',email:'E-Mail',whatsapp:'WhatsApp',
newCustomer:'Neuer Kunde',newVehicle:'Fahrzeug hinzufügen',newRepair:'Neuer Auftrag',newAppt:'Neuer Termin',
font:'Schriftgröße',language:'Programmsprache',hourly:'Stundensatz €',phone:'Werkstatt / WhatsApp',
invoiceNote:'Rechnungen bleiben auf Deutsch, wenn die aktive Firma in Deutschland ist.',
saved:'Gespeichert',backup:'Backup exportieren',sync:'Aus Cloud synchronisieren',reset:'Demodaten löschen'},
ar:{app:'BayMeister',tag:'WERKSTATT. DIGITAL. EFFIZIENT.',user:'اسم المستخدم',pass:'كلمة المرور',login:'دخول',logout:'خروج',
dash:'الرئيسية',customers:'العملاء',vehicles:'السيارات',repairs:'أوامر الإصلاح',appointments:'المواعيد',
estimates:'Kostenvoranschlag',invoices:'الفواتير و Barverkauf',purchases:'المشتريات',inventory:'المخزون وقطع الغيار',
employees:'الموظفون والرواتب',expenses:'المصاريف',journal:'دفتر اليومية',reports:'التقارير',integrations:'التكاملات',
audit:'سجل النشاط',settings:'الإعدادات',search:'بحث: لوحة / زبون / قطعة / أمر',
save:'حفظ',cancel:'إلغاء',print:'طباعة',pdf:'PDF',email:'إيميل',whatsapp:'واتساب',
newCustomer:'عميل جديد',newVehicle:'إضافة سيارة',newRepair:'أمر إصلاح جديد',newAppt:'موعد جديد',
font:'حجم الخط',language:'لغة البرنامج',hourly:'سعر ساعة العمل €',phone:'هاتف الورشة / واتساب',
invoiceNote:'الفاتورة تبقى بالألمانية إذا كانت الشركة النشطة في ألمانيا.',
saved:'تم الحفظ',backup:'تصدير نسخة احتياطية',sync:'مزامنة من السحابة',reset:'مسح بيانات التجربة'}
};
['es','fr','tr','ru','pl','it','nl','pt','uk','fa','hi','zh','ja','ko'].forEach(code=>{
  if(!window.WP_I18N[code]) window.WP_I18N[code]=Object.assign({}, window.WP_I18N.en);
});
Object.assign(window.WP_I18N.es,{dash:'Hoy',customers:'Clientes',vehicles:'Vehículos',repairs:'Órdenes',appointments:'Citas',invoices:'Facturas',purchases:'Compras',inventory:'Inventario',settings:'Ajustes',login:'Entrar',logout:'Salir',language:'Idioma del programa',invoiceNote:'Las facturas permanecen en alemán si la empresa activa está en Alemania.'});
Object.assign(window.WP_I18N.fr,{dash:'Aujourd’hui',customers:'Clients',vehicles:'Véhicules',repairs:'Ordres',appointments:'Rendez-vous',invoices:'Factures',purchases:'Achats',inventory:'Stock',settings:'Paramètres',login:'Connexion',logout:'Déconnexion',language:'Langue du logiciel',invoiceNote:'Les factures restent en allemand si l’entreprise active est en Allemagne.'});
Object.assign(window.WP_I18N.tr,{dash:'Bugün',customers:'Müşteriler',vehicles:'Araçlar',repairs:'İş emirleri',appointments:'Randevular',invoices:'Faturalar',purchases:'Alımlar',inventory:'Stok',settings:'Ayarlar',login:'Giriş',logout:'Çıkış',language:'Program dili',invoiceNote:'Aktif firma Almanya’daysa faturalar Almanca kalır.'});
Object.assign(window.WP_I18N.ru,{dash:'Сегодня',customers:'Клиенты',vehicles:'Авто',repairs:'Заказы',appointments:'Записи',invoices:'Счета',purchases:'Закупки',inventory:'Склад',settings:'Настройки',login:'Вход',logout:'Выход',language:'Язык программы',invoiceNote:'Счета остаются на немецком, если активная фирма в Германии.'});
Object.assign(window.WP_I18N.pl,{dash:'Dziś',customers:'Klienci',vehicles:'Pojazdy',repairs:'Zlecenia',appointments:'Terminy',invoices:'Faktury',purchases:'Zakupy',inventory:'Magazyn',settings:'Ustawienia',login:'Zaloguj',logout:'Wyloguj',language:'Język programu',invoiceNote:'Faktury pozostają po niemiecku, gdy aktywna firma jest w Niemczech.'});

window.WP_INV_DE = {
  invoice:'Rechnung', invoices:'Rechnungsliste', number:'Rechnungsnr.', date:'Datum', customer:'Kunde',
  vehicle:'Fahrzeug', plate:'Kennzeichen', type:'Art', net:'Netto', tax:'MwSt.', total:'Gesamt',
  payment:'Zahlungsart', cash:'Barverkauf', item:'Position', qty:'Menge', price:'Einzelpreis',
  workshop:'Werkstatt', page:'Seite', thanks:'Vielen Dank für Ihr Vertrauen.',
  unpaid:'offen', paid:'bezahlt', labor:'Arbeitslohn', parts:'Ersatzteile'
};

window.t = function(key){
  const lang = (window.db && db.settings && db.settings.uiLang) || (window.db && window.db.settings && window.db.settings.uiLang) || 'ar';
  const pack = window.WP_I18N[lang] || window.WP_I18N.en;
  return pack[key] || window.WP_I18N.en[key] || window.WP_I18N.ar[key] || key;
};
window.docLang = function(){
  const co = window.session && session.company;
  if(co && (co.country === 'DE' || co.id === 'de' || /AUTOSERVICE|Deutschland|Germany/i.test(co.name||''))) return 'de';
  if(co && co.country === 'ES') return 'es';
  return 'de';
};
window.applyUiLang = function(){
  const lang = (db && db.settings && db.settings.uiLang) || 'ar';
  const rtl = window.WP_RTL.includes(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
};
window.langOptions = function(selected){
  return window.WP_LANGS.map(([code,name])=>`<option value="${code}" ${code===selected?'selected':''}>${name} (${code})</option>`).join('');
};
