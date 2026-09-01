/* WerkPilot i18n
   UI follows selected language.
   Invoices/print for DE companies stay German. */
window.WP_RTL = ['ar','fa','ur','he','ps','sd','ug','dv','yi'];
window.WP_LANGS = [
  ['de','Deutsch'],
  ['ar','العربية'],
  ['en','English'],
  ['tr','Türkçe'],
  ['sr','Srpski'],
  ['ru','Русский'],
  ['pl','Polski'],
  ['es','Español']
];
window.WP_ALLOWED_LANGS = ['de','ar','en','tr','sr','ru','pl','es'];

window.WP_I18N = {
en:{positions:'Positions',quickEntry:'Quick entry',colPos:'Pos',colArt:'Type',colQty:'Qty',colPrice:'Unit',colSum:'Sum',colVat:'VAT',orderNo:'Part no.',apply:'Apply',henryHint:'Enter number and press Enter.',catalog:'Catalog',pasteHint:'Paste lines',paste:'Paste',laborDefault:'Labor',app:'Werkivo',tag:'WORKSHOP. DIGITAL. EFFICIENT.',user:'Username',pass:'Password',login:'Sign in',logout:'Logout',
cashSale:'Cash sale',netParts:'Net parts',netLabor:'Net labor',vat19:'VAT 19%',
dash:'Today',todayBoard:'Today',carsInShop:'Cars in shop',openJobs:'Open jobs',todayAppts:'Appointments today',lowStock:'Low stock',sales:'Sales',netApprox:'Approx. net',
stockAlert:'Stock alert',maintDue:'Service due',
vatReport:'VAT report (19%)',backupWarn:'No backup exported for more than a day. Settings → Export backup.',
todayCars:'Today / active jobs',todayApptsTitle:'Appointments today',
noCarsInShop:'No vehicles in the shop now.',noApptsToday:'No appointments today.',
openBtn:'Open',stInProgress:'In progress',stWaitParts:'Waiting for parts',
stConfirmed:'Confirmed',stIntake:'Check-in',stDiag:'Diagnosis',stWorking:'Working',
stDone:'Completed',stClosed:'Closed',
customers:'Customers',vehicles:'Vehicles',repairs:'Repair orders',appointments:'Appointments',
estimates:'Quotes',invoices:'Invoices & cash sale',purchases:'Purchases',inventory:'Inventory & parts',
employees:'Staff & payroll',expenses:'Expenses',journal:'Journal',reports:'Reports',integrations:'Integrations',
audit:'Activity log',settings:'Settings',help:'Help',search:'Search: plate / customer / part / job',
save:'Save',cancel:'Cancel',print:'Print',pdf:'PDF',email:'Email',whatsapp:'WhatsApp',
printList:'Print list',pdfList:'PDF list',
name:'Name / company',phone:'Phone',taxId:'Tax ID',address:'Address',cars:'Vehicles',action:'Action',
edit:'Edit',newInvoice:'New invoice',invoicesOf:'Invoices',preview:'Preview',del:'Delete',
invoiceNo:'Number',type:'Type',vehicle:'Vehicle',total:'Total',payment:'Payment',design:'Actions',
newCustomer:'New customer',newVehicle:'Add vehicle',newRepair:'New repair order',newAppt:'New appointment',
studio:'Developer studio',todayShort:'Today',ordersShort:'Jobs',carsShort:'Cars',apptShort:'Dates',invShort:'Invoices',
confirmDelInv:'Delete invoice',invDeleted:'Invoice deleted',invMissing:'Invoice not found',
allInvoices:'All invoices',createInvoice:'+ New invoice',
editCustomer:'Edit customer',customerType:'Customer type',person:'Person',company:'Company',
contact:'Name / contact',companyName:'Company name',custNo:'Customer no.',
custVehicle:'Customer vehicle',plate:'Plate',vinLbl:'VIN (Enter to load data)',
kbaKey:'KBA key',make:'Make',model:'Model',year:'Year',km:'Mileage',
needName:'Enter customer or company name',noPhoto:'No photo',openCam:'Open camera',
savePhoto:'Save photo',pickPhoto:'Choose a photo first',photoSaved:'Vehicle photo saved',
addVehicle:'Add vehicle',customer:'Customer',displacement:'Displacement (cm³)',
fuel:'Fuel',powerKw:'Power (kW)',engineCode:'Engine code',paintCode:'Color code',
nextService:'Next service at km',partsCat:'Parts catalog',
editInvoice:'Edit invoice',createInv:'New invoice',payMethod:'Payment method',
payOpen:'Open',payCash:'Cash',payCard:'Card',payBank:'Bank transfer',
taxPct:'VAT %',discount:'Discount €',invLines:'Invoice lines',
kindParts:'Parts',kindLabor:'Labor',sku:'Part no.',desc:'Description',
qty:'Qty',price:'Price',noVehicle:'No vehicle / direct sale',
prev:'Previous',next:'Next',cancelBtn:'Cancel',
font:'Font size',language:'Program language',hourly:'Labor hourly rate €',phone:'Workshop / WhatsApp phone',
invoiceNote:'Invoices stay in German when the active company is in Germany.',
saved:'Saved',backup:'Export backup',sync:'Sync from cloud',reset:'Reset demo data'},
de:{positions:'Positionen',quickEntry:'Schnellerfassung',colPos:'Pos',colArt:'Art',colQty:'Menge',colPrice:'E-Preis',colSum:'Summe',colVat:'MwSt.',orderNo:'Bestellnummer',apply:'Übernehmen',henryHint:'Nummer eingeben und Enter.',catalog:'Katalog',pasteHint:'Zeilen einfügen',paste:'Einfügen',laborDefault:'Arbeitswert',app:'Werkivo',tag:'WERKSTATT. DIGITAL. EFFIZIENT.',user:'Benutzername',pass:'Passwort',login:'Anmelden',logout:'Abmelden',
cashSale:'Barverkauf',netParts:'Netto Teile',netLabor:'Netto Leistungen',vat19:'MwSt. 19%',
dash:'Heute',todayBoard:'Heute',carsInShop:'Fahrzeuge in der Werkstatt',openJobs:'Offene Aufträge',todayAppts:'Termine heute',lowStock:'Lagerengpass',sales:'Umsatz',netApprox:'Näherungsweise Netto',
stockAlert:'Lagerhinweis',maintDue:'Fällige Wartung',
vatReport:'USt-Bericht (19%)',backupWarn:'Seit über einem Tag kein Backup. Einstellungen → Backup exportieren.',
todayCars:'Heute / aktive Aufträge',todayApptsTitle:'Termine heute',
noCarsInShop:'Keine Fahrzeuge in der Werkstatt.',noApptsToday:'Keine Termine heute.',
openBtn:'Öffnen',stInProgress:'In Arbeit',stWaitParts:'Wartet auf Teile',
stConfirmed:'Bestätigt',stIntake:'Annahme',stDiag:'Diagnose',stWorking:'In Arbeit',
stDone:'Fertig',stClosed:'Abgeschlossen',
customers:'Kunden',vehicles:'Fahrzeuge',repairs:'Reparaturaufträge',appointments:'Termine',
estimates:'Kostenvoranschläge',invoices:'Rechnungen & Barverkauf',purchases:'Einkäufe',inventory:'Lager & Teile',
employees:'Mitarbeiter & Lohn',expenses:'Ausgaben',journal:'Journal',reports:'Berichte',integrations:'Integrationen',
audit:'Aktivitätsprotokoll',settings:'Einstellungen',help:'Hilfe',search:'Suche: Kennzeichen / Kunde / Teil / Auftrag',
save:'Speichern',cancel:'Abbrechen',print:'Drucken',pdf:'PDF',email:'E-Mail',whatsapp:'WhatsApp',
printList:'Liste drucken',pdfList:'Liste als PDF',
name:'Name / Firma',phone:'Telefon',taxId:'USt-IdNr.',address:'Adresse',cars:'Fahrzeuge',action:'Aktion',
edit:'Bearbeiten',newInvoice:'Neue Rechnung',invoicesOf:'Rechnungen',preview:'Vorschau',del:'Löschen',
invoiceNo:'Nummer',type:'Art',vehicle:'Fahrzeug',total:'Gesamt',payment:'Zahlung',design:'Aktionen',
newCustomer:'Neuer Kunde',newVehicle:'Fahrzeug hinzufügen',newRepair:'Neuer Auftrag',newAppt:'Neuer Termin',
studio:'Entwicklerstudio',todayShort:'Heute',ordersShort:'Aufträge',carsShort:'Autos',apptShort:'Termine',invShort:'Rechnungen',
confirmDelInv:'Rechnung löschen',invDeleted:'Rechnung gelöscht',invMissing:'Rechnung nicht gefunden',
allInvoices:'Alle Rechnungen',createInvoice:'+ Neue Rechnung',
editCustomer:'Kunde bearbeiten',customerType:'Kundentyp',person:'Privat',company:'Firma',
contact:'Name / Ansprechpartner',companyName:'Firmenname',custNo:'Kundennummer',
custVehicle:'Kundenfahrzeug',plate:'Kennzeichen',vinLbl:'FIN (Enter lädt Daten)',
kbaKey:'KBA-Schlüssel',make:'Marke',model:'Modell',year:'Baujahr',km:'Kilometerstand',
needName:'Name oder Firma eingeben',noPhoto:'Kein Foto',openCam:'Kamera öffnen',
savePhoto:'Foto speichern',pickPhoto:'Zuerst ein Foto wählen',photoSaved:'Fahrzeugfoto gespeichert',
addVehicle:'Fahrzeug anlegen',customer:'Kunde',displacement:'Hubraum (cm³)',
fuel:'Kraftstoff',powerKw:'Leistung (kW)',engineCode:'Motorcode',paintCode:'Farbcode',
nextService:'Nächste Wartung bei km',partsCat:'Teilekatalog',
editInvoice:'Rechnung bearbeiten',createInv:'Neue Rechnung',payMethod:'Zahlungsart',
payOpen:'Offen',payCash:'Bar',payCard:'Karte',payBank:'Überweisung',
taxPct:'MwSt. %',discount:'Rabatt €',invLines:'Rechnungspositionen',
kindParts:'Ersatzteile',kindLabor:'Arbeitslohn',sku:'Art.-Nr.',desc:'Bezeichnung',
qty:'Menge',price:'Preis',noVehicle:'Kein Fahrzeug / Barverkauf',
prev:'Zurück',next:'Weiter',cancelBtn:'Abbrechen',
font:'Schriftgröße',language:'Programmsprache',hourly:'Stundensatz €',phone:'Werkstatt / WhatsApp',
invoiceNote:'Rechnungen bleiben auf Deutsch, wenn die aktive Firma in Deutschland ist.',
saved:'Gespeichert',backup:'Backup exportieren',sync:'Aus Cloud synchronisieren',reset:'Demodaten löschen'},
ar:{positions:'البنود',quickEntry:'إدخال سريع',colPos:'م',colArt:'النوع',colQty:'العدد',colPrice:'السعر',colSum:'المجموع',colVat:'الضريبة',orderNo:'رقم القطعة',apply:'اعتماد',henryHint:'اكتب الرقم واضغط Enter.',catalog:'الكتالوج',pasteHint:'لصق الأسطر',paste:'لصق',laborDefault:'أجور عمل',app:'Werkivo',tag:'ورشة. رقمية. فعالة.',user:'اسم المستخدم',pass:'كلمة المرور',login:'دخول',logout:'خروج',
cashSale:'بيع نقدي',netParts:'صافي القطع',netLabor:'صافي الأجور',vat19:'الضريبة 19%',
dash:'الرئيسية',todayBoard:'لوحة اليوم',carsInShop:'سيارات داخل الورشة',openJobs:'أوامر مفتوحة',todayAppts:'مواعيد اليوم',lowStock:'نقص مخزون',sales:'المبيعات',netApprox:'صافي تقريبي',
stockAlert:'تنبيه مخزون',maintDue:'صيانة مستحقة',
vatReport:'تقرير الضريبة (19%)',backupWarn:'لم يتم تصدير البيانات منذ أكثر من يوم. من الإعدادات → نسخ احتياطي.',
todayCars:'سيارات اليوم / الأوامر النشطة',todayApptsTitle:'مواعيد اليوم',
noCarsInShop:'لا توجد سيارات داخل الورشة الآن.',noApptsToday:'لا مواعيد اليوم.',
openBtn:'فتح',stInProgress:'قيد التنفيذ',stWaitParts:'انتظار قطع',
stConfirmed:'مؤكد',stIntake:'استلام',stDiag:'تشخيص',stWorking:'جاري العمل',
stDone:'منجز',stClosed:'مغلق',
customers:'العملاء',vehicles:'السيارات',repairs:'أوامر الإصلاح',appointments:'المواعيد',
estimates:'عروض الأسعار',invoices:'الفواتير والبيع النقدي',purchases:'المشتريات',inventory:'المخزون وقطع الغيار',
employees:'الموظفون والرواتب',expenses:'المصاريف',journal:'دفتر اليومية',reports:'التقارير',integrations:'التكاملات',
audit:'سجل النشاط',settings:'الإعدادات',help:'مساعدة',search:'بحث: لوحة / زبون / قطعة / أمر',
save:'حفظ',cancel:'إلغاء',print:'طباعة',pdf:'PDF',email:'إيميل',whatsapp:'واتساب',
printList:'طباعة القائمة',pdfList:'PDF القائمة',
name:'الاسم / الشركة',phone:'الهاتف',taxId:'الرقم الضريبي',address:'العنوان',cars:'السيارات',action:'إجراء',
edit:'تعديل',newInvoice:'فاتورة جديدة',invoicesOf:'فواتير',preview:'معاينة',del:'حذف',
invoiceNo:'رقم',type:'النوع',vehicle:'السيارة',total:'الإجمالي',payment:'الدفع',design:'إجراء',
newCustomer:'عميل جديد',newVehicle:'إضافة سيارة',newRepair:'أمر إصلاح جديد',newAppt:'موعد جديد',
studio:'استوديو التطوير',todayShort:'اليوم',ordersShort:'الأوامر',carsShort:'سيارات',apptShort:'مواعيد',invShort:'فواتير',
confirmDelInv:'حذف الفاتورة',invDeleted:'تم حذف الفاتورة',invMissing:'الفاتورة غير موجودة',
allInvoices:'كل الفواتير',createInvoice:'+ إنشاء فاتورة',
editCustomer:'تعديل عميل',customerType:'نوع العميل',person:'شخص',company:'شركة',
contact:'الاسم / جهة الاتصال',companyName:'اسم الشركة',custNo:'رقم العميل',
custVehicle:'سيارة العميل',plate:'اللوحة',vinLbl:'VIN (Enter لجلب البيانات)',
kbaKey:'مفتاح KBA',make:'الماركة',model:'الموديل',year:'السنة',km:'الكيلومتر',
needName:'أدخل اسم العميل أو اسم الشركة',noPhoto:'لا صورة',openCam:'فتح الكاميرا',
savePhoto:'حفظ الصورة',pickPhoto:'اختر صورة أولاً',photoSaved:'تم حفظ صورة السيارة',
addVehicle:'إضافة سيارة',customer:'العميل',displacement:'سعة المحرك (cm³)',
fuel:'نوع الوقود',powerKw:'قوة المحرك (kW)',engineCode:'كود المحرك',paintCode:'كود اللون',
nextService:'الصيانة القادمة عند كم',partsCat:'كتالوج القطع',
editInvoice:'تعديل فاتورة',createInv:'إنشاء فاتورة',payMethod:'طريقة الدفع',
payOpen:'غير محدد',payCash:'نقدي',payCard:'بطاقة',payBank:'تحويل بنكي',
taxPct:'الضريبة %',discount:'الخصم €',invLines:'بنود الفاتورة',
kindParts:'قطع غيار',kindLabor:'أجور عمالة',sku:'البند',desc:'الوصف',
qty:'العدد',price:'السعر',noVehicle:'بدون سيارة / بيع مباشر',
prev:'السابق',next:'التالي',cancelBtn:'إلغاء',
font:'حجم الخط',language:'لغة البرنامج',hourly:'سعر ساعة العمل €',phone:'هاتف الورشة / واتساب',
invoiceNote:'الفاتورة تبقى بالألمانية إذا كانت الشركة النشطة في ألمانيا.',
saved:'تم الحفظ',backup:'تصدير نسخة احتياطية',sync:'مزامنة من السحابة',reset:'مسح بيانات التجربة'}
};
['es','fr','tr','ru','pl','it','nl','pt','uk','fa','hi','zh','ja','ko'].forEach(code=>{
  if(!window.WP_I18N[code]) window.WP_I18N[code]=Object.assign({}, window.WP_I18N.en);
});
Object.assign(window.WP_I18N.es,{
app:'Werkivo',tag:'TALLER. DIGITAL. EFICIENTE.',user:'Usuario',pass:'Contraseña',login:'Entrar',logout:'Salir',
cashSale:'Venta al contado',netParts:'Neto recambios',netLabor:'Neto mano de obra',vat19:'IVA 19%',
dash:'Hoy',todayBoard:'Hoy',carsInShop:'Coches en el taller',openJobs:'Órdenes abiertas',todayAppts:'Citas hoy',lowStock:'Stock bajo',sales:'Ventas',netApprox:'Neto aprox.',
stockAlert:'Aviso de stock',maintDue:'Mantenimiento pendiente',
vatReport:'Informe de IVA (19%)',backupWarn:'Sin copia de seguridad desde hace más de un día. Ajustes → Exportar copia.',
todayCars:'Hoy / órdenes activas',todayApptsTitle:'Citas de hoy',
noCarsInShop:'No hay vehículos en el taller.',noApptsToday:'No hay citas hoy.',
openBtn:'Abrir',stInProgress:'En curso',stWaitParts:'Esperando piezas',
stConfirmed:'Confirmado',stIntake:'Recepción',stDiag:'Diagnóstico',stWorking:'En trabajo',
stDone:'Terminado',stClosed:'Cerrado',stReady:'Listo para entrega',stDelivered:'Entregado',
customers:'Clientes',vehicles:'Vehículos',repairs:'Órdenes de reparación',appointments:'Citas',
estimates:'Presupuestos',invoices:'Facturas y venta al contado',purchases:'Compras',inventory:'Almacén y piezas',
employees:'Personal y nómina',expenses:'Gastos',journal:'Diario',reports:'Informes',integrations:'Integraciones',
audit:'Registro',settings:'Ajustes',search:'Buscar: matrícula / cliente / pieza / orden',
save:'Guardar',cancel:'Cancelar',print:'Imprimir',pdf:'PDF',email:'Correo',whatsapp:'WhatsApp',
printList:'Imprimir lista',pdfList:'Lista PDF',
name:'Nombre / empresa',phone:'Teléfono',taxId:'NIF / IVA',address:'Dirección',cars:'Vehículos',action:'Acción',
edit:'Editar',newInvoice:'Nueva factura',invoicesOf:'Facturas',preview:'Vista previa',del:'Eliminar',
invoiceNo:'Número',type:'Tipo',vehicle:'Vehículo',total:'Total',payment:'Pago',design:'Acciones',
newCustomer:'Nuevo cliente',newVehicle:'Añadir vehículo',newRepair:'Nueva orden',newAppt:'Nueva cita',
studio:'Estudio de desarrollo',todayShort:'Hoy',ordersShort:'Órdenes',carsShort:'Coches',apptShort:'Citas',invShort:'Facturas',
confirmDelInv:'Eliminar factura',invDeleted:'Factura eliminada',invMissing:'Factura no encontrada',
allInvoices:'Todas las facturas',createInvoice:'+ Nueva factura',
editCustomer:'Editar cliente',customerType:'Tipo de cliente',person:'Particular',company:'Empresa',
contact:'Nombre / contacto',companyName:'Nombre de empresa',custNo:'N.º cliente',
custVehicle:'Vehículo del cliente',plate:'Matrícula',vinLbl:'VIN (Enter carga datos)',
kbaKey:'Clave KBA',make:'Marca',model:'Modelo',year:'Año',km:'Kilometraje',
needName:'Introduzca nombre o empresa',noPhoto:'Sin foto',openCam:'Abrir cámara',
savePhoto:'Guardar foto',pickPhoto:'Elija una foto primero',photoSaved:'Foto del vehículo guardada',
addVehicle:'Añadir vehículo',customer:'Cliente',displacement:'Cilindrada (cm³)',
fuel:'Combustible',powerKw:'Potencia (kW)',engineCode:'Código motor',paintCode:'Código color',
nextService:'Próximo servicio a km',partsCat:'Catálogo de piezas',
editInvoice:'Editar factura',createInv:'Nueva factura',payMethod:'Forma de pago',
payOpen:'Pendiente',payCash:'Efectivo',payCard:'Tarjeta',payBank:'Transferencia',
taxPct:'IVA %',discount:'Descuento €',invLines:'Líneas de factura',
kindParts:'Recambios',kindLabor:'Mano de obra',sku:'N.º art.',desc:'Descripción',
qty:'Cant.',price:'Precio',noVehicle:'Sin vehículo / venta directa',
prev:'Anterior',next:'Siguiente',cancelBtn:'Cancelar',
font:'Tamaño de fuente',language:'Idioma del programa',hourly:'Tarifa horaria €',
invoiceNote:'Las facturas legales de Alemania permanecen en alemán.',
saved:'Guardado',backup:'Exportar copia',sync:'Sincronizar nube',reset:'Borrar datos demo'
});
window.WP_I18N.tr=Object.assign({},window.WP_I18N.de,{
  tag:'ATÖLYE. DİJİTAL. VERİMLİ.',user:'Kullanıcı adı',pass:'Şifre',login:'Giriş',logout:'Çıkış',
  dash:'Bugün',todayBoard:'Bugün',carsInShop:'Atölyedeki araçlar',openJobs:'Açık işler',todayAppts:'Bugünkü randevular',lowStock:'Düşük stok',sales:'Ciro',
  customers:'Müşteriler',vehicles:'Araçlar',repairs:'İş emirleri',appointments:'Randevular',
  estimates:'Teklifler',invoices:'Faturalar ve peşin satış',purchases:'Alımlar',inventory:'Depo ve parçalar',
  employees:'Personel ve maaş',expenses:'Giderler',journal:'Yevmiye',reports:'Raporlar',settings:'Ayarlar',
  search:'Arama: plaka / müşteri / parça / iş',save:'Kaydet',cancelBtn:'İptal',print:'Yazdır',
  createInvoice:'+ Yeni fatura',cashSale:'Peşin satış',prev:'Geri',language:'Program dili',
  kindParts:'Yedek parça',kindLabor:'İşçilik',payOpen:'Açık',payCash:'Nakit',payCard:'Kart',payBank:'Havale',
  invoiceNote:'Aktif firma Almanya’daysa fatura Almanca basılır.'
});
window.WP_I18N.sr=Object.assign({},window.WP_I18N.de,{
  tag:'RADIONICA. DIGITALNO. EFIKASNO.',user:'Korisničko ime',pass:'Lozinka',login:'Prijava',logout:'Odjava',
  dash:'Danas',todayBoard:'Danas',carsInShop:'Vozila u radionici',openJobs:'Otvoreni nalozi',todayAppts:'Termini danas',lowStock:'Niska zaliha',sales:'Promet',
  customers:'Klijenti',vehicles:'Vozila',repairs:'Nalozi',appointments:'Termini',
  estimates:'Ponude',invoices:'Računi i gotovina',purchases:'Nabavke',inventory:'Magacin i delovi',
  employees:'Zaposleni i plata',expenses:'Troškovi',journal:'Dnevnik',reports:'Izveštaji',settings:'Podešavanja',
  search:'Pretraga: tablica / klijent / deo / nalog',save:'Sačuvaj',cancelBtn:'Otkaži',print:'Štampaj',
  createInvoice:'+ Novi račun',cashSale:'Gotovinska prodaja',prev:'Nazad',language:'Jezik programa',
  kindParts:'Rezervni deo',kindLabor:'Rad',payOpen:'Otvoreno',payCash:'Gotovina',payCard:'Kartica',payBank:'Prenos',
  invoiceNote:'Ako je aktivna firma u Nemačkoj, račun ostaje na nemačkom.'
});
window.WP_I18N.ru=Object.assign({},window.WP_I18N.de,{
  tag:'МАСТЕРСКАЯ. ЦИФРОВО. ЭФФЕКТИВНО.',user:'Логин',pass:'Пароль',login:'Вход',logout:'Выход',
  dash:'Сегодня',todayBoard:'Сегодня',carsInShop:'Авто в цехе',openJobs:'Открытые заказы',todayAppts:'Записи на сегодня',lowStock:'Мало на складе',sales:'Оборот',
  customers:'Клиенты',vehicles:'Автомобили',repairs:'Заказ-наряды',appointments:'Записи',
  estimates:'Сметы',invoices:'Счета и наличные',purchases:'Закупки',inventory:'Склад и запчасти',
  employees:'Сотрудники и зарплата',expenses:'Расходы',journal:'Журнал',reports:'Отчёты',settings:'Настройки',
  search:'Поиск: номер / клиент / деталь / заказ',save:'Сохранить',cancelBtn:'Отмена',print:'Печать',
  createInvoice:'+ Новый счёт',cashSale:'Наличная продажа',prev:'Назад',language:'Язык программы',
  kindParts:'Запчасть',kindLabor:'Работа',payOpen:'Открыто',payCash:'Наличные',payCard:'Карта',payBank:'Перевод',
  invoiceNote:'Если фирма в Германии, счёт печатается по-немецки.'
});
window.WP_I18N.pl=Object.assign({},window.WP_I18N.de,{
  tag:'WARSZTAT. CYFROWO. EFEKTYWNIE.',user:'Użytkownik',pass:'Hasło',login:'Zaloguj',logout:'Wyloguj',
  dash:'Dziś',todayBoard:'Dziś',carsInShop:'Auta w warsztacie',openJobs:'Otwarte zlecenia',todayAppts:'Terminy dziś',lowStock:'Niski stan',sales:'Obrót',
  customers:'Klienci',vehicles:'Pojazdy',repairs:'Zlecenia',appointments:'Terminy',
  estimates:'Oferty',invoices:'Faktury i sprzedaż gotówkowa',purchases:'Zakupy',inventory:'Magazyn i części',
  employees:'Pracownicy i płace',expenses:'Koszty',journal:'Dziennik',reports:'Raporty',settings:'Ustawienia',
  search:'Szukaj: tablica / klient / część / zlecenie',save:'Zapisz',cancelBtn:'Anuluj',print:'Drukuj',
  createInvoice:'+ Nowa faktura',cashSale:'Sprzedaż gotówkowa',prev:'Wstecz',language:'Język programu',
  kindParts:'Część',kindLabor:'Robocizna',payOpen:'Otwarte',payCash:'Gotówka',payCard:'Karta',payBank:'Przelew',
  invoiceNote:'Gdy firma jest w Niemczech, faktura zostaje po niemiecku.'
});

window.WP_INV_DE = {
  invoice:'Rechnung', invoices:'Rechnungsliste', number:'Rechnungsnr.', date:'Datum', customer:'Kunde',
  vehicle:'Fahrzeug', plate:'Kennzeichen', type:'Art', net:'Netto', tax:'MwSt.', total:'Gesamt',
  payment:'Zahlungsart', cash:'Barverkauf', item:'Position', qty:'Menge', price:'Einzelpreis',
  workshop:'Werkstatt', page:'Seite', thanks:'Vielen Dank für Ihr Vertrauen.',
  unpaid:'offen', paid:'bezahlt', labor:'Arbeitslohn', parts:'Ersatzteile'
};

(function(){
  const extra={
    en:{
      noData:'No data yet.',noResults:'No results',records:'records',showing:'Showing',of:'of',
      searchResults:'Search results',photo:'Photo',noPhoto:'No photo',savePhoto:'Save photo',
      photoSaved:'Photo saved',carMissing:'Vehicle not found',photoFail:'Could not save photo',
      takeOrUploadPhoto:'Take or upload a vehicle photo after saving the data',
      openCam:'Open camera',loginBlocked:'Too many attempts. Refresh the page shortly.',
      loginBad:'Incorrect username or password',newWorkshop:'New workshop',
      email:'Email',date:'Date',time:'Time',status:'Status',note:'Note',tech:'Technician',
      hours:'Hours',qty:'Qty',skuCol:'Part no.',buy:'Buy',sell:'Sell',minQty:'Min. qty',
      inStock:'In stock',shortStock:'Low',underMin:'Below minimum',
      newPart:'New part',newEmployee:'New employee',roleJob:'Role',salary:'Salary',
      newExpense:'New expense',scanBill:'Scan receipt',amount:'Amount',category:'Category',
      statement:'Description',newEntry:'New entry',account:'Account',debit:'Debit',credit:'Credit',
      sales:'Sales',costsPurch:'Expenses + purchases',approxDiff:'Approximate difference',
      unpaidInvoices:'Unpaid invoices',hoursLogged:'Logged labor hours',topParts:'Most used parts',
      customerDebts:'Customer debts',noDebts:'No open debts.',
      listCustomers:'Customer list',listVehicles:'Vehicle list',listPurchases:'Purchase list',
      listInventory:'Inventory list',report:'Report',purchaseInv:'Purchase invoice',
      supplier:'Supplier',invNum:'Invoice no.',
      repairOrders:'Repair orders',manualOrder:'Manual order',scanSchein:'Scan registration',
      scanScheinOpen:'Scan registration and open job',noOrders:'No repair orders yet.',
      jobCard:'Job card',back:'Back',saveKm:'Save mileage',complaint:'Complaint',work:'Work',
      fuel:'Fuel',jobsList:'Jobs',issuePart:'Issue part from stock',issue:'Issue',
      labor:'Labor',parts:'Parts',photosBA:'Photos before / after',before:'Before',after:'After',
      toInvoice:'Convert to invoice',waReady:'WhatsApp ready',editOrder:'Edit repair order',
      newOrder:'New repair order',saveEdit:'Save changes',createOrder:'Create job',
      orderMissing:'Job not found',kmNow:'Current mileage',
      fuelEmpty:'Empty',fuelQ:'1/4',fuelH:'1/2',fuelF:'Full',
      jobsOnePerLine:'Jobs (one per line)',partsLineFmt:'Parts: SKU|name|qty|price (one per line)',
      appointmentsTitle:'Appointments',newApptBtn:'+ New appointment',convertJob:'Convert to job',
      converted:'Converted',apptMissing:'Appointment not found',
      clash:'Conflict: same technician and time already booked',
      createQuote:'Create quote',partsCol:'Parts',laborCol:'Labor',discount:'Discount',tax:'VAT',
      quoteFee:'Quote fee',
      stReady:'Ready for pickup',stDelivered:'Delivered',
      activeWs:'Active workshop',wsOnly:'Every invoice and stock item belongs to this workshop only.',
      langHint:'The interface changes immediately. Printed invoices stay German for DE companies.',
      invAddr:'Workshop address on invoice',invTpl:'Invoice template',
      tplShop:'Workshop — current invoice style',tplModern:'Modern — black & gold',
      tplClassic:'Classic — blue frame',tplAtelier:'Atelier — wide header',
      brandName:'Trade name',legalName:'Legal name on invoice',payDays:'Payment term (days)',
      paper:'Paper',margins:'Print margins',printColors:'Print colors',
      marginTight:'Tight 6 mm',marginDef:'Default 8 mm',marginNorm:'Normal 12 mm',
      colorYes:'Color (black/gold)',colorNo:'Black & white',
      bank:'Bank',invEmail:'Invoice email',ownerGf:'Managing director',
      newPass:'New password for your account',passUnchanged:'Leave empty to keep current password',
      integrationsTitle:'Integrations',auditTitle:'Activity log',when:'Time',userCol:'User',
      actionCol:'Action',detailCol:'Details',
      journalTitle:'Journal',reportsTitle:'Reports',
      expensesTitle:'Expenses',employeesTitle:'Staff & payroll',
      inventoryTitle:'Inventory & parts',
      readAdd:'Read and add',readingInv:'Reading invoice...',
      pickBillFirst:'Choose or photograph the receipt first',
      expenseAdded:'Expense added',errGeneric:'An error occurred',
      camDenied:'Camera permission denied',shotOk:'Photo captured',
      pdfOk:'PDF created',pdfFail:'Could not create PDF',pdfWait:'Preparing PDF...',
      printFail:'Could not open printer',
      workshopAdded:'Workshop added — complete legal data in Settings',
      needWsName:'Enter a workshop name',
      resetAsk:'Delete all local data?',synced:'Synced',syncing:'Syncing...',
      exported:'Exported',
      hoursShort:'h'
    },
    de:{
      noData:'Noch keine Daten.',noResults:'Keine Treffer',records:'Datensätze',showing:'Anzeige',of:'von',
      searchResults:'Suchergebnisse',photo:'Foto',noPhoto:'Kein Foto',savePhoto:'Foto speichern',
      photoSaved:'Foto gespeichert',carMissing:'Fahrzeug nicht gefunden',photoFail:'Foto konnte nicht gespeichert werden',
      takeOrUploadPhoto:'Fahrzeugfoto nach dem Speichern aufnehmen oder hochladen',
      openCam:'Kamera öffnen',loginBlocked:'Zu viele Versuche. Seite in Kürze neu laden.',
      loginBad:'Benutzername oder Passwort falsch',newWorkshop:'Neue Werkstatt',
      email:'E-Mail',date:'Datum',time:'Uhrzeit',status:'Status',note:'Notiz',tech:'Techniker',
      hours:'Stunden',qty:'Menge',skuCol:'Art.-Nr.',buy:'EK',sell:'VK',minQty:'Mindestbestand',
      inStock:'Vorrätig',shortStock:'Knapp',underMin:'Unter Mindestbestand',
      newPart:'Neues Teil',newEmployee:'Neuer Mitarbeiter',roleJob:'Funktion',salary:'Gehalt',
      newExpense:'Neue Ausgabe',scanBill:'Beleg scannen',amount:'Betrag',category:'Kategorie',
      statement:'Bezeichnung',newEntry:'Neuer Buchungssatz',account:'Konto',debit:'Soll',credit:'Haben',
      sales:'Umsatz',costsPurch:'Ausgaben + Einkäufe',approxDiff:'Ungefährer Saldo',
      unpaidInvoices:'Offene Rechnungen',hoursLogged:'Erfasste Arbeitsstunden',topParts:'Meistgenutzte Teile',
      customerDebts:'Kundenforderungen',noDebts:'Keine offenen Forderungen.',
      listCustomers:'Kundenliste',listVehicles:'Fahrzeugliste',listPurchases:'Einkaufsliste',
      listInventory:'Lagerliste',report:'Bericht',purchaseInv:'Einkaufsbeleg',
      supplier:'Lieferant',invNum:'Belegnr.',
      repairOrders:'Reparaturaufträge',manualOrder:'Manueller Auftrag',scanSchein:'Fahrzeugschein scannen',
      scanScheinOpen:'Schein scannen und Auftrag öffnen',noOrders:'Noch keine Aufträge.',
      jobCard:'Auftragskarte',back:'Zurück',saveKm:'km speichern',complaint:'Kundenangabe',work:'Arbeit',
      fuel:'Kraftstoff',jobsList:'Arbeiten',issuePart:'Teil aus Lager entnehmen',issue:'Entnehmen',
      labor:'Lohn',parts:'Teile',photosBA:'Fotos vorher / nachher',before:'Vorher',after:'Nachher',
      toInvoice:'In Rechnung wandeln',waReady:'WhatsApp fertig',editOrder:'Auftrag bearbeiten',
      newOrder:'Neuer Auftrag',saveEdit:'Änderung speichern',createOrder:'Auftrag anlegen',
      orderMissing:'Auftrag nicht gefunden',kmNow:'Aktueller Kilometerstand',
      fuelEmpty:'Leer',fuelQ:'1/4',fuelH:'1/2',fuelF:'Voll',
      jobsOnePerLine:'Arbeiten (eine je Zeile)',partsLineFmt:'Teile: SKU|Name|Menge|Preis (eine je Zeile)',
      appointmentsTitle:'Termine',newApptBtn:'+ Neuer Termin',convertJob:'In Auftrag wandeln',
      converted:'Übernommen',apptMissing:'Termin nicht gefunden',
      clash:'Konflikt: gleicher Techniker zur gleichen Zeit',
      createQuote:'Kostenvoranschlag erstellen',partsCol:'Teile',laborCol:'Lohn',discount:'Rabatt',tax:'MwSt.',
      quoteFee:'KV-Gebühr',
      stReady:'Abholbereit',stDelivered:'Ausgeliefert',
      activeWs:'Aktive Werkstatt',wsOnly:'Jede Rechnung und jeder Lagerartikel gehört nur zu dieser Werkstatt.',
      langHint:'Die Oberfläche wechselt sofort. Gedruckte Rechnungen bleiben bei DE-Firmen auf Deutsch.',
      invAddr:'Adresse auf der Rechnung',invTpl:'Rechnungsvorlage',
      tplShop:'Werkstatt — aktuelles Layout',tplModern:'Modern — Schwarz/Gold',
      tplClassic:'Klassisch — blauer Rahmen',tplAtelier:'Atelier — breite Kopfzeile',
      brandName:'Handelsname',legalName:'Rechtsname auf der Rechnung',payDays:'Zahlungsziel (Tage)',
      paper:'Papier',margins:'Druckränder',printColors:'Druckfarben',
      marginTight:'Eng 6 mm',marginDef:'Standard 8 mm',marginNorm:'Normal 12 mm',
      colorYes:'Farbe (Schwarz/Gold)',colorNo:'Schwarzweiß',
      bank:'Bank',invEmail:'Rechnungs-E-Mail',ownerGf:'Geschäftsführer',
      newPass:'Neues Passwort für Ihr Konto',passUnchanged:'Leer lassen = unverändert',
      integrationsTitle:'Integrationen',auditTitle:'Aktivitätsprotokoll',when:'Zeit',userCol:'Benutzer',
      actionCol:'Aktion',detailCol:'Details',
      journalTitle:'Journal',reportsTitle:'Berichte',
      expensesTitle:'Ausgaben',employeesTitle:'Mitarbeiter & Lohn',
      inventoryTitle:'Lager & Teile',
      readAdd:'Lesen und hinzufügen',readingInv:'Beleg wird gelesen...',
      pickBillFirst:'Zuerst Beleg wählen oder fotografieren',
      expenseAdded:'Ausgabe hinzugefügt',errGeneric:'Ein Fehler ist aufgetreten',
      camDenied:'Kamerazugriff verweigert',shotOk:'Foto aufgenommen',
      pdfOk:'PDF erstellt',pdfFail:'PDF konnte nicht erstellt werden',pdfWait:'PDF wird vorbereitet...',
      printFail:'Drucker konnte nicht geöffnet werden',
      workshopAdded:'Werkstatt angelegt — Rechtsdaten unter Einstellungen ergänzen',
      needWsName:'Werkstattname eingeben',
      resetAsk:'Alle lokalen Daten löschen?',synced:'Synchronisiert',syncing:'Synchronisiere...',
      exported:'Exportiert',
      hoursShort:'Std.'
    },
    ar:{
      noData:'لا توجد بيانات بعد.',noResults:'لا نتائج',records:'سجل',showing:'عرض',of:'من',
      searchResults:'نتائج البحث',photo:'صورة',noPhoto:'لا صورة',savePhoto:'حفظ الصورة',
      photoSaved:'تم حفظ الصورة',carMissing:'السيارة غير موجودة',photoFail:'تعذر حفظ الصورة',
      takeOrUploadPhoto:'التقط أو ارفع صورة السيارة بعد تسجيل البيانات',
      openCam:'فتح الكاميرا',loginBlocked:'تم إيقاف المحاولة مؤقتاً. حدّث الصفحة بعد قليل.',
      loginBad:'بيانات الدخول غير صحيحة',newWorkshop:'ورشة جديدة',
      email:'إيميل',date:'التاريخ',time:'الوقت',status:'حالة',note:'ملاحظة',tech:'الفني',
      hours:'ساعات',qty:'الكمية',skuCol:'رقم القطعة',buy:'شراء',sell:'بيع',minQty:'الحد الأدنى',
      inStock:'متوفر',shortStock:'نقص',underMin:'تحت الحد الأدنى',
      newPart:'قطعة جديدة',newEmployee:'موظف جديد',roleJob:'الوظيفة',salary:'الراتب',
      newExpense:'مصروف جديد',scanBill:'تصوير فاتورة',amount:'المبلغ',category:'الفئة',
      statement:'البيان',newEntry:'قيد جديد',account:'الحساب',debit:'مدين',credit:'دائن',
      sales:'المبيعات',costsPurch:'المصاريف + المشتريات',approxDiff:'الفرق التقريبي',
      unpaidInvoices:'فواتير غير مسددة',hoursLogged:'ساعات العمل المسجّلة',topParts:'أكثر القطع استخداماً',
      customerDebts:'ديون الزبائن',noDebts:'لا ديون ظاهرة.',
      listCustomers:'قائمة العملاء',listVehicles:'قائمة السيارات',listPurchases:'قائمة المشتريات',
      listInventory:'قائمة المخزون',report:'تقرير',purchaseInv:'فاتورة شراء',
      supplier:'المورد',invNum:'رقم الفاتورة',
      repairOrders:'أوامر الإصلاح',manualOrder:'أمر يدوي',scanSchein:'تصوير ورقة السيارة',
      scanScheinOpen:'تصوير ورقة السيارة وفتح أمر',noOrders:'لا أوامر بعد.',
      jobCard:'بطاقة الأمر',back:'رجوع',saveKm:'حفظ الكم',complaint:'الشكوى',work:'العمل',
      fuel:'وقود',jobsList:'الأعمال',issuePart:'صرف قطعة من المخزون',issue:'صرف',
      labor:'أجور',parts:'قطع',photosBA:'صور قبل / بعد',before:'قبل',after:'بعد',
      toInvoice:'تحويل لفاتورة',waReady:'واتساب جاهز',editOrder:'تعديل أمر الإصلاح',
      newOrder:'أمر إصلاح جديد',saveEdit:'حفظ التعديل',createOrder:'إنشاء الأمر',
      orderMissing:'الأمر غير موجود',kmNow:'الكيلومتر الحالي',
      fuelEmpty:'فارغ',fuelQ:'ربع',fuelH:'نصف',fuelF:'ممتلئ',
      jobsOnePerLine:'قائمة الأعمال (سطر لكل عمل)',partsLineFmt:'القطع: SKU|الاسم|الكمية|السعر (سطر لكل قطعة)',
      appointmentsTitle:'المواعيد',newApptBtn:'+ موعد جديد',convertJob:'تحويل لأمر',
      converted:'تم التحويل',apptMissing:'الموعد غير موجود',
      clash:'تعارض: نفس الفني ونفس الوقت محجوز',
      createQuote:'إنشاء تقدير',partsCol:'القطع',laborCol:'الأجور',discount:'الخصم',tax:'الضريبة',
      quoteFee:'رسوم التقدير',
      stReady:'جاهز للتسليم',stDelivered:'مسلَّم',
      activeWs:'الورشة النشطة',wsOnly:'كل فاتورة ومخزون مربوط بهذه الورشة فقط.',
      langHint:'واجهة البرنامج تتغير فوراً. الفاتورة المطبوعة تبقى بلغة الشركة (ألماني لـ DE).',
      invAddr:'عنوان الورشة على الفاتورة',invTpl:'قالب الفاتورة',
      tplShop:'ورشة — مثل فاتورتكم الحالية',tplModern:'حديث — شريط أسود وذهبي',
      tplClassic:'كلاسيكي — إطار أزرق رسمي',tplAtelier:'أتيليه — عنوان عريض',
      brandName:'اسم الورشة التجاري',legalName:'الاسم القانوني على الفاتورة',payDays:'مهلة الدفع (أيام)',
      paper:'ورق الطباعة',margins:'هوامش الطباعة',printColors:'ألوان الطباعة',
      marginTight:'ضيقة 6مم',marginDef:'افتراضي 8مم',marginNorm:'عادية 12مم',
      colorYes:'ملون (أسود/ذهبي)',colorNo:'أبيض وأسود',
      bank:'البنك',invEmail:'إيميل الفاتورة',ownerGf:'صاحب الورشة',
      newPass:'كلمة سر جديدة لحسابك',passUnchanged:'فارغة = بدون تغيير',
      integrationsTitle:'التكاملات',auditTitle:'سجل النشاط',when:'الوقت',userCol:'المستخدم',
      actionCol:'الإجراء',detailCol:'التفاصيل',
      journalTitle:'دفتر اليومية',reportsTitle:'التقارير',
      expensesTitle:'المصاريف',employeesTitle:'الموظفون والرواتب',
      inventoryTitle:'المخزون وقطع الغيار',
      readAdd:'قراءة وإضافة',readingInv:'جاري قراءة الفاتورة...',
      pickBillFirst:'اختر أو صوّر الفاتورة أولاً',
      expenseAdded:'تمت إضافة المصروف بنجاح',errGeneric:'حدث خطأ',
      camDenied:'لم يتم السماح باستخدام الكاميرا',shotOk:'تم التقاط الصورة بنجاح',
      pdfOk:'تم إنشاء PDF',pdfFail:'تعذر إنشاء PDF',pdfWait:'جاري تجهيز PDF...',
      printFail:'تعذر فتح الطابعة',
      workshopAdded:'تمت إضافة الورشة — املأ البيانات القانونية من الإعدادات',
      needWsName:'أدخل اسم الورشة',
      resetAsk:'سيتم حذف كل البيانات المحلية. متابعة؟',synced:'تمت المزامنة',syncing:'جاري المزامنة...',
      exported:'تم التصدير',
      hoursShort:'س'
    }
  };
  ['en','de','ar'].forEach(function(code){
    if(window.WP_I18N[code]) Object.assign(window.WP_I18N[code], extra[code]);
  });
})();
(function(){
  const w={
    en:{download:'Download',walkIn:'No customer / direct sale',stornoHint:'The invoice is cancelled (Storno), not deleted. The number stays archived.',pickFile:'Choose file',openCam:'Open camera',takePhoto:'Take photo',shotOk:'Photo captured',camDenied:'Camera permission denied',camUnsupported:'Camera not supported in this browser'},
    de:{download:'Herunterladen',walkIn:'Ohne Kunde / Barverkauf',stornoHint:'Die Rechnung wird storniert, nicht gelöscht. Die Nummer bleibt im Archiv.',pickFile:'Datei wählen',openCam:'Kamera öffnen',takePhoto:'Foto aufnehmen',shotOk:'Foto aufgenommen',camDenied:'Kamerazugriff verweigert',camUnsupported:'Kamera in diesem Browser nicht verfügbar'},
    ar:{download:'تحميل',walkIn:'بدون عميل / بيع مباشر',stornoHint:'الفاتورة تتلغى (Storno) وما بتنحذف. الرقم بيضل بالأرشيف.',pickFile:'اختيار ملف',openCam:'فتح الكاميرا',takePhoto:'التقاط الصورة',shotOk:'تم التقاط الصورة',camDenied:'لم يُسمح بالكاميرا',camUnsupported:'الكاميرا غير مدعومة في هذا المتصفح'},
    tr:{walkIn:'Müşterisiz / peşin satış',pickFile:'Dosya seç',openCam:'Kamerayı aç',takePhoto:'Fotoğraf çek',shotOk:'Fotoğraf alındı',camDenied:'Kamera izni yok',camUnsupported:'Kamera yok'},
    sr:{walkIn:'Bez klijenta / gotovina',pickFile:'Izaberi fajl',openCam:'Otvori kameru',takePhoto:'Slikaj',shotOk:'Slika snimljena',camDenied:'Nema dozvole za kameru',camUnsupported:'Kamera nije podržana'},
    ru:{walkIn:'Без клиента / наличные',pickFile:'Выбрать файл',openCam:'Открыть камеру',takePhoto:'Сделать фото',shotOk:'Фото сохранено',camDenied:'Нет доступа к камере',camUnsupported:'Камера недоступна'},
    pl:{walkIn:'Bez klienta / sprzedaż bezpośrednia',pickFile:'Wybierz plik',openCam:'Otwórz kamerę',takePhoto:'Zrób zdjęcie',shotOk:'Zdjęcie zapisane',camDenied:'Brak dostępu do kamery',camUnsupported:'Kamera niedostępna'},
    es:{walkIn:'Sin cliente / venta directa',pickFile:'Elegir archivo',openCam:'Abrir cámara',takePhoto:'Tomar foto',shotOk:'Foto guardada',camDenied:'Cámara no permitida',camUnsupported:'Cámara no disponible'}
  };
  Object.keys(w).forEach(c=>{ if(window.WP_I18N&&WP_I18N[c]) Object.assign(WP_I18N[c], w[c]); });
})();
(function(){
  const extra={
    en:{plHint:'Open PartsLink24 with the selected VIN.',plOpen:'Open PartsLink24',waTitle:'Workshop WhatsApp',waHint:'Send ready-for-pickup from the repair order.',tseHint:'Interface ready. Live TSE needs a certified provider.',katyHintInt:'Save login once. Type the part number on the invoice to fill name and price.',katyUser:'Katy user',katyPass:'Katy password',saveLogin:'Save login',openKaty:'Open Katy',openHenry:'Open Henry',henryImportHint:'Import Henry CSV (number;name;price).',katySaved:'Login saved on this device',imported:'Imported',exportWs:'Export this workshop',newWorkshop:'New workshop'},
    de:{plHint:'PartsLink24 mit der VIN des gewählten Fahrzeugs öffnen.',plOpen:'PartsLink24 öffnen',waTitle:'Werkstatt-WhatsApp',waHint:'Abholbereit-Nachricht aus dem Reparaturauftrag senden.',tseHint:'Schnittstelle vorbereitet. Live-TSE braucht einen zertifizierten Anbieter.',katyHintInt:'Einmal anmelden. Teilenummer in der Rechnung eingeben — Name und Preis kommen aus Lager oder Henry-Import.',katyUser:'Katy-Benutzer',katyPass:'Katy-Passwort',saveLogin:'Anmeldung speichern',openKaty:'Katy öffnen',openHenry:'Henry öffnen',henryImportHint:'Henry-Liste importieren (CSV: Nummer;Name;Preis).',katySaved:'Anmeldung auf diesem Gerät gespeichert',imported:'Importiert',exportWs:'Diese Werkstatt exportieren',newWorkshop:'Neue Werkstatt'},
    ar:{plHint:'افتح الموقع مع VIN السيارة المحددة.',plOpen:'فتح PartsLink24',waTitle:'واتساب الورشة',waHint:'إرسال جاهزية السيارة من أوامر الإصلاح.',tseHint:'نقطة تكامل جاهزة. الربط الحقيقي يحتاج مزوداً معتمداً.',katyHintInt:'سجّل دخولك مرة. رقم القطعة بالفاتورة يعبّي الاسم والسعر.',katyUser:'مستخدم Katy',katyPass:'كلمة سر Katy',saveLogin:'حفظ الدخول',openKaty:'فتح Katy',openHenry:'فتح Henry',henryImportHint:'استورد قائمة Henry (CSV).',katySaved:'تم حفظ الدخول على هذا الجهاز',imported:'تم الاستيراد',exportWs:'نسخة هذه الورشة',newWorkshop:'ورشة جديدة'}
  };
  Object.keys(extra).forEach(c=>{ if(window.WP_I18N&&WP_I18N[c]) Object.assign(WP_I18N[c], extra[c]); });
  ['tr','sr','ru','pl','es'].forEach(c=>{ if(window.WP_I18N&&WP_I18N[c]) Object.assign(WP_I18N[c], extra.en||{}); });
})();
(function(){
  const z={
    en:{
      pdfFailLib:'Could not load PDF library',pdfNotLoaded:'PDF library missing — refresh the page',
      ocrFailSchein:'Could not read the registration document',newCustDefault:'New customer',holderOf:'Keeper',
      scheinIntake:'Check-in from registration',jobOpened:'Job opened',kmSaved:'Mileage saved',
      noStockItem:'Part not in stock',qtyLow:'Not enough quantity',jobMissing:'Job not found',
      apptMissing:'Appointment not found',shopAppt:'Workshop appointment',purchaseAdded:'Purchase saved',
      deleted:'Deleted',noReceipt:'No receipt stored',expenseDefault:'Expense',errorGeneric:'Error',
      enterWsName:'Enter workshop name',wsAdded:'Workshop added — fill legal data in Settings',
      exported:'Exported',syncing:'Syncing…',synced:'Synced',resetConfirm:'Delete all local data?',
      resetDone:'Reset done',ownerOnly:'Owner only',vinNeed17:'VIN must be 17 characters',
      fetchingCar:'Looking up vehicle…',missModel:'model',missEngine:'engine code',missCc:'displacement',
      vinFail:'VIN lookup failed',hsnNeed:'Enter HSN (4) and TSN (3)',fetchingKba:'Looking up KBA…',
      kbaNoModel:'Model not in free source — complete manually',invoiceCreated:'Invoice created',
      copyVinPl24:'— copy into PartsLink24',openPl24:'Open PartsLink24',
      waTpl:'Hello {name},\nYour vehicle {car} is ready for pickup.\nWork: {work}\nPlease come during opening hours.\nTST Autoteile und Autoservice',
      askWriteFirst:'Write a request first',reqSaved:'Request saved',copiedGrok:'Copied — paste in Grok',
      devTitle:'Grok in the workshop',devHint:'Owner only. Save a change request, then paste it in Grok.',
      devPh:'Example: add VIN field on the job card',saveReq:'Save request',copyAll:'Copy all',closeBtn:'Close',
      noReqs:'No requests yet.',exportFull:'Export full JSON',importJson:'Import JSON',reseed:'Reload demo data',
      devNotesLbl:'Dev notes',notesSaved:'Notes saved',invalidFile:'Invalid file',pdfSaved:'PDF saved',
      reportWord:'Report',mechanic:'Technician',saveSlim:'Saved after reducing photos',saveFail:'Local save failed — export a backup now',loggedInAs:'Signed in as',helpTitle:'Werkivo — short guide',help1:'Sign in (mechanic: ismail / 1977A).',help2:'Photograph the registration — customer and vehicle are created.',help3:'Check mileage, open a job or invoice.',help4:'Lines like Henry: number, qty, Enter.',help5:'Save → preview → print / PDF (number stays).',helpInv:'The invoice stays German. UI language only changes the screens.',archive:'Document archive',conflicts:'Sync conflicts',impressum:'Imprint',privacy:'Privacy',scheinFilled:'Registration read — check and save',nextForCar:'Next: appointment, invoice or quote',alignSchein:'Fit the registration card inside the gold frame',retake:'Retake',usePhoto:'Use photo',noFlash:'Flash not available'
    },
    de:{
      pdfFailLib:'PDF-Bibliothek konnte nicht geladen werden',pdfNotLoaded:'PDF-Bibliothek fehlt — Seite aktualisieren',
      ocrFailSchein:'Fahrzeugschein konnte nicht gelesen werden',newCustDefault:'Neukunde',holderOf:'Halter',
      scheinIntake:'Annahme über Fahrzeugschein',jobOpened:'Auftrag geöffnet',kmSaved:'Kilometerstand gespeichert',
      noStockItem:'Teil nicht im Lager',qtyLow:'Menge nicht ausreichend',jobMissing:'Auftrag nicht gefunden',
      apptMissing:'Termin nicht gefunden',shopAppt:'Werkstatttermin',purchaseAdded:'Einkauf gespeichert',
      deleted:'Gelöscht',noReceipt:'Kein Beleg gespeichert',expenseDefault:'Ausgabe',errorGeneric:'Fehler',
      enterWsName:'Werkstattname eingeben',wsAdded:'Werkstatt angelegt — Rechtsdaten in den Einstellungen ergänzen',
      exported:'Exportiert',syncing:'Synchronisiere…',synced:'Synchronisiert',resetConfirm:'Alle lokalen Daten löschen?',
      resetDone:'Zurückgesetzt',ownerOnly:'Nur Inhaber',vinNeed17:'VIN muss 17 Zeichen haben',
      fetchingCar:'Fahrzeugdaten werden geladen…',missModel:'Modell',missEngine:'Motorcode',missCc:'Hubraum',
      vinFail:'VIN-Abfrage fehlgeschlagen',hsnNeed:'HSN (4) und TSN (3) eingeben',fetchingKba:'KBA-Daten werden geladen…',
      kbaNoModel:'Modell in der freien Quelle nicht enthalten — manuell ergänzen',invoiceCreated:'Rechnung erstellt',
      copyVinPl24:'— in PartsLink24 kopieren',openPl24:'PartsLink24 öffnen',
      waTpl:'Guten Tag {name},\nIhr Fahrzeug {car} ist abholbereit.\nArbeit: {work}\nBitte kommen Sie in den Öffnungszeiten vorbei.\nTST Autoteile und Autoservice',
      askWriteFirst:'Zuerst die Anfrage schreiben',reqSaved:'Anfrage gespeichert',copiedGrok:'Kopiert — in Grok einfügen',
      devTitle:'Grok in der Werkstatt',devHint:'Nur Inhaber. Anfrage speichern, dann in Grok einfügen.',
      devPh:'Beispiel: VIN-Feld auf der Auftragskarte',saveReq:'Anfrage speichern',copyAll:'Alles kopieren',closeBtn:'Schließen',
      noReqs:'Noch keine Anfragen.',exportFull:'Komplettes JSON exportieren',importJson:'JSON importieren',reseed:'Demodaten laden',
      devNotesLbl:'Entwickler-Notizen',notesSaved:'Notizen gespeichert',invalidFile:'Ungültige Datei',pdfSaved:'PDF gespeichert',
      reportWord:'Bericht',mechanic:'Techniker',saveSlim:'Gespeichert nach Verkleinern der Fotos',saveFail:'Lokales Speichern fehlgeschlagen — jetzt Backup exportieren',loggedInAs:'Sie sind angemeldet als',helpTitle:'Werkivo — Kurz-Anleitung',help1:'Anmelden (Mechaniker: ismail / 1977A).',help2:'Fahrzeugschein fotografieren — Kunde und Fahrzeug werden angelegt.',help3:'km-Stand prüfen, Auftrag oder Rechnung öffnen.',help4:'Positionen wie in Henry: Nummer, Menge, Enter.',help5:'Speichern → Vorschau → Drucken / PDF (Belegnummer bleibt).',helpInv:'Die Rechnung bleibt immer Deutsch. Die Programmsprache ändert nur die Bedienung.',archive:'Beleg-Archiv',conflicts:'Sync-Konflikte',impressum:'Impressum',privacy:'Datenschutz',scheinFilled:'Fahrzeugschein gelesen — prüfen und speichern',nextForCar:'Weiter: Termin, Rechnung oder Kostenvoranschlag',alignSchein:'Fahrzeugschein in den goldenen Rahmen legen',retake:'Erneut aufnehmen',usePhoto:'Foto verwenden',noFlash:'Blitz nicht verfügbar'
    },
    ar:{
      pdfFailLib:'تعذر تحميل مكتبة PDF',pdfNotLoaded:'مكتبة PDF غير محمّلة — حدّث الصفحة',
      ocrFailSchein:'تعذرت قراءة ورقة السيارة',newCustDefault:'زبون جديد',holderOf:'مالك',
      scheinIntake:'استلام من ورقة السيارة',jobOpened:'تم فتح الأمر',kmSaved:'تم حفظ الكيلومتر',
      noStockItem:'لا قطعة بالمخزون',qtyLow:'الكمية غير كافية',jobMissing:'الأمر غير موجود',
      apptMissing:'الموعد غير موجود',shopAppt:'موعد ورشة',purchaseAdded:'تمت إضافة الشراء',
      deleted:'تم الحذف',noReceipt:'لا توجد فاتورة محفوظة',expenseDefault:'مصروف',errorGeneric:'حدث خطأ',
      enterWsName:'أدخل اسم الورشة',wsAdded:'تمت إضافة الورشة — املأ البيانات القانونية من الإعدادات',
      exported:'تم التصدير',syncing:'جاري المزامنة...',synced:'تمت المزامنة',resetConfirm:'سيتم حذف كل البيانات المحلية. متابعة؟',
      resetDone:'تمت إعادة الضبط',ownerOnly:'هذه الصفحة لصاحب الورشة فقط',vinNeed17:'VIN لازم 17 خانة',
      fetchingCar:'جاري جلب بيانات السيارة...',missModel:'الموديل',missEngine:'كود المحرك',missCc:'سعة المحرك',
      vinFail:'تعذر قراءة VIN',hsnNeed:'أدخل HSN (4) وTSN (3)',fetchingKba:'جاري جلب بيانات السيارة من المواقع المجانية...',
      kbaNoModel:'الموديل مو موجود بهالمصدر المجاني، كمّل يدوياً',invoiceCreated:'تم إنشاء الفاتورة',
      copyVinPl24:'— انسخه في PartsLink24',openPl24:'افتح حساب PartsLink24',
      waTpl:'مرحباً {name}،\nسيارتك {car}\nأصبحت جاهزة للتسليم في الورشة.\nالعمل: {work}\nيمكنكم الحضور خلال ساعات العمل.\nTST Autoteile und Autoservice',
      askWriteFirst:'اكتب الطلب أولاً',reqSaved:'تم حفظ الطلب',copiedGrok:'تم النسخ — الصقه في Grok',
      devTitle:'Grok داخل الورشة',devHint:'هاللوحة إلك وحدك (owner). اكتب التعديل ثم الصقه في Grok.',
      devPh:'مثال: أضف خانة رقم الهيكل على بطاقة الأمر',saveReq:'حفظ الطلب',copyAll:'نسخ الكل',closeBtn:'إغلاق',
      noReqs:'ما في طلبات بعد.',exportFull:'تصدير JSON كامل',importJson:'استيراد JSON',reseed:'إعادة بيانات التجربة',
      devNotesLbl:'ملاحظات تطوير',notesSaved:'تم حفظ الملاحظات',invalidFile:'ملف غير صالح',pdfSaved:'تم حفظ PDF',
      reportWord:'تقرير',mechanic:'الميكانيكي',saveSlim:'الحفظ تم بعد تخفيف الصور',saveFail:'تعذر الحفظ المحلي — صدّر نسخة احتياطية',loggedInAs:'مسجّل الدخول باسم',helpTitle:'Werkivo — دليل مختصر',help1:'تسجيل الدخول (الميكانيكي: ismail / 1977A).',help2:'صوّر ورقة السيارة — ينحفظ العميل والسيارة.',help3:'راجع الكم وافتح أمر أو فاتورة.',help4:'البنود مثل Henry: الرقم، الكمية، Enter.',help5:'حفظ ثم معاينة ثم طباعة / PDF (الرقم يبقى).',helpInv:'الفاتورة تبقى بالألمانية. لغة البرنامج للواجهة فقط.',archive:'أرشيف المستندات',conflicts:'تعارضات المزامنة',impressum:'البيان القانوني',privacy:'الخصوصية',scheinFilled:'تمت قراءة ورقة السيارة — راجع واحفظ',nextForCar:'التالي: موعد أو فاتورة أو تقدير',alignSchein:'حط كرت السيارة جوا الإطار الذهبي',retake:'إعادة التصوير',usePhoto:'اعتماد الصورة',noFlash:'الفلاش غير متاح'
    }
  };
  Object.keys(z).forEach(c=>{ if(window.WP_I18N&&WP_I18N[c]) Object.assign(WP_I18N[c], z[c]); });
  ['tr','sr','ru','pl','es'].forEach(c=>{ if(window.WP_I18N&&WP_I18N[c]) Object.assign(WP_I18N[c], z.en); });
})();
window.t = function(key){
  const store = (typeof db!=='undefined' && db) || window.db || (window.WP && WP.db);
  let lang = (store && store.settings && store.settings.uiLang) || 'de';
  if(!(window.WP_ALLOWED_LANGS||['de','ar','en']).includes(lang)) lang='de';
  const pack = (window.WP_I18N && (WP_I18N[lang] || WP_I18N.de)) || {};
  return pack[key] || (WP_I18N.de && WP_I18N.de[key]) || (WP_I18N.en && WP_I18N.en[key]) || key;
};
window.stLabel = function(s){
  const map={
    intake:'stIntake',diag:'stDiag',wait_parts:'stWaitParts',working:'stWorking',ready:'stReady',delivered:'stDelivered',done:'stDone',closed:'stClosed',confirmed:'stConfirmed',converted:'converted','قيد التنفيذ':'stInProgress','جاري العمل':'stWorking','استلام':'stIntake',
    'تشخيص':'stDiag','انتظار قطع':'stWaitParts','مؤكد':'stConfirmed',
    'منجز':'stDone','مغلق':'stClosed','جاهز للتسليم':'stReady','مسلَّم':'stDelivered','مسلم':'stDelivered',
    'تم التحويل':'converted','In Arbeit':'stInProgress','Bestätigt':'stConfirmed'
  };
  return map[s] ? t(map[s]) : (s||'');
};
window.dLabel = function(s){
  if(!s) return '';
  const lang=((typeof db!=='undefined'&&db&&db.settings&&db.settings.uiLang)||'de');
  const map={
    'تغيير زيت + فلتر':{de:'Ölwechsel + Filter',en:'Oil change + filter',es:'Cambio de aceite + filtro'},
    'صوت من المحرك عند التشغيل':{de:'Geräusch beim Start',en:'Noise at start',es:'Ruido al arrancar'},
    'تغيير زيت':{de:'Ölwechsel',en:'Oil change',es:'Cambio de aceite'},
    'تغيير فلتر زيت':{de:'Ölfilterwechsel',en:'Oil filter change',es:'Cambio de filtro de aceite'},
    'فحص فرامل أمامية':{de:'Vorderbremsen prüfen',en:'Front brake check',es:'Revisión de frenos delanteros'},
    'صرير عند الفرملة':{de:'Quietschen beim Bremsen',en:'Squeal when braking',es:'Chirrido al frenar'},
    'فحص فرامل':{de:'Bremsen prüfen',en:'Brake check',es:'Revisión de frenos'},
    'تغيير فحمات إن لزم':{de:'Beläge wechseln falls nötig',en:'Replace pads if needed',es:'Cambiar pastillas si hace falta'},
    'تسليم بعد تغيير الزيت':{de:'Abholung nach Ölwechsel',en:'Pickup after oil change',es:'Entrega tras el cambio de aceite'},
    'الميكانيكي':{de:'Mechaniker',en:'Mechanic',es:'Mecánico'},
    'المدير':{de:'Manager',en:'Manager',es:'Gerente'},
    'أمين المستودع':{de:'Lagerist',en:'Warehouse',es:'Almacenero'},
    'صاحب الورشة / تطوير':{de:'Inhaber / Entwicklung',en:'Owner / development',es:'Propietario / desarrollo'},
    'المحاسب':{de:'Buchhaltung',en:'Accountant',es:'Contable'},
    'إيجار الورشة':{de:'Werkstattmiete',en:'Shop rent',es:'Alquiler del taller'},
    'تشغيل':{de:'Betrieb',en:'Operations',es:'Operación'},
    'فني':{de:'Techniker',en:'Technician',es:'Técnico'},
    'مستودع':{de:'Lager',en:'Warehouse',es:'Almacén'},
    'زيت محرك 5W30 5L':{de:'Motoröl 5W30 5L',en:'Engine oil 5W30 5L',es:'Aceite 5W30 5L'},
    'فلتر زيت VW':{de:'Ölfilter VW',en:'VW oil filter',es:'Filtro de aceite VW'},
    'فحمات فرامل أمامية':{de:'Vorderbremsbeläge',en:'Front brake pads',es:'Pastillas delanteras'},
    'بطارية 12V 70Ah':{de:'Batterie 12V 70Ah',en:'Battery 12V 70Ah',es:'Batería 12V 70Ah'},
    'طلب تجريبي':{de:'Testdatensatz',en:'Demo record',es:'Registro de prueba'},
    'أحمد الخليل':{de:'Ahmad Al-Khalil',en:'Ahmad Al-Khalil',es:'Ahmad Al-Khalil'},
    'يوسف منصور':{de:'Youssef Mansour',en:'Youssef Mansour',es:'Youssef Mansour'},
    'فاتورة':{de:'Rechnung',en:'Invoice',es:'Factura'},
    'مبيعات':{de:'Umsatz',en:'Sales',es:'Ventas'},
    'مصروف':{de:'Ausgabe',en:'Expense',es:'Gasto'},
    'قطع':{de:'Teile',en:'Parts',es:'Piezas'},
    'أجور':{de:'Lohn',en:'Labor',es:'Mano de obra'},
    'أجر':{de:'Lohn',en:'Labor',es:'Mano de obra'},
    'قطعة':{de:'Teil',en:'Part',es:'Pieza'},
    'نصف':{de:'halb',en:'half',es:'medio'},
    'ربع':{de:'viertel',en:'quarter',es:'cuarto'},
    'فارغ':{de:'leer',en:'empty',es:'vacío'},
    'ممتلئ':{de:'voll',en:'full',es:'lleno'},
    'نقدي':{de:'Bar',en:'Cash',es:'Efectivo'},
    'بطاقة':{de:'Karte',en:'Card',es:'Tarjeta'},
    'تحويل بنكي':{de:'Überweisung',en:'Bank transfer',es:'Transferencia'},
    'غير محدد':{de:'offen',en:'open',es:'pendiente'},
    'مدفوع':{de:'bezahlt',en:'paid',es:'pagado'},
    'معلق':{de:'offen',en:'pending',es:'pendiente'},
    'زيت محرك':{de:'Motoröl',en:'Engine oil',es:'Aceite de motor'},
    'فلتر زيت':{de:'Ölfilter',en:'Oil filter',es:'Filtro de aceite'},
    'فحمات فرامل':{de:'Bremsbeläge',en:'Brake pads',es:'Pastillas de freno'},
    'بيع نقدي':{de:'Barverkauf',en:'Cash sale',es:'Venta al contado'}
  };
  if(map[s]) return lang==='ar' ? s : (map[s][lang]||s);
  for(const [ar,locs] of Object.entries(map)){
    if(locs.de===s || locs.en===s || locs.es===s || s==='Barverkauf' || s==='Rechnung'){
      if(s==='Barverkauf' || locs.de===s || locs.en===s || locs.es===s){
        if(lang==='ar') return ar;
        return locs[lang]||ar;
      }
    }
  }
  if(s==='Barverkauf') return t('cashSale');
  if(s==='Rechnung' || s==='فاتورة') return t('createInv')==='إنشاء فاتورة' && lang==='ar' ? 'فاتورة' : (lang==='de'?'Rechnung':lang==='es'?'Factura':'Invoice');
  return s;
};
window.L = function(s){
  if(s==null) return '';
  s=String(s);
  const lang=((typeof db!=='undefined'&&db&&db.settings&&db.settings.uiLang)||'de');
  const phrases={
    'WERKSTATT. DIGITAL. EFFIZIENT.':{ar:'ورشة. رقمية. فعالة.',en:'WORKSHOP. DIGITAL. EFFICIENT.',es:'TALLER. DIGITAL. EFICIENTE.',de:'WERKSTATT. DIGITAL. EFFIZIENT.',tr:'ATÖLYE. DİJİTAL. VERİMLİ.',sr:'RADIONICA. DIGITALNO. EFIKASNO.',ru:'МАСТЕРСКАЯ. ЦИФРОВО. ЭФФЕКТИВНО.',pl:'WARSZTAT. CYFROWO. EFEKTYWNIE.'},
    'Netto Teile':{ar:'صافي القطع',en:'Net parts',es:'Neto recambios',de:'Netto Teile'},
    'Netto Leistungen':{ar:'صافي الأجور',en:'Net labor',es:'Neto mano de obra',de:'Netto Leistungen'},
    'MwSt 19%':{ar:'الضريبة 19%',en:'VAT 19%',es:'IVA 19%',de:'MwSt. 19%'},
    'Barverkauf':{ar:'بيع نقدي',en:'Cash sale',es:'Venta al contado',de:'Barverkauf'}
  };
  const trim=s.trim();
  if(phrases[trim] && phrases[trim][lang]) return phrases[trim][lang];
  const exact=window.dLabel(s);
  if(exact && exact!==s) return exact;
  if(lang==='ar') return s;
  if(!/[\u0600-\u06FF]/.test(s)) return s;
  return s.split(/(\s+|·|,|\(|\)|\/|\+|—|-)/).map(p=>{
    if(!/[\u0600-\u06FF]/.test(p)) return p;
    const d=window.dLabel(p);
    if(d && d!==p) return d;
    if(typeof stLabel==='function'){ const st=stLabel(p); if(st && st!==p) return st; }
    if(typeof fuelLabel==='function'){ const fl=fuelLabel(p); if(fl && fl!==p) return fl; }
    return p;
  }).join('');
};
window.scrubUiLang = function(root){
  if(!root) return;
  const skip=/^(INPUT|TEXTAREA|SCRIPT|STYLE)$/;
  const walk=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){
      const pe=n.parentElement;
      if(!pe || skip.test(pe.tagName)) return NodeFilter.FILTER_REJECT;
      if(pe.closest && (pe.closest('.print-doc') || pe.closest('#prevHost') || pe.closest('.rh-sheet') || pe.closest('.rechnung'))) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes=[];
  while(walk.nextNode()) nodes.push(walk.currentNode);
  nodes.forEach(n=>{
    const nv=window.L(n.nodeValue);
    if(nv!==n.nodeValue) n.nodeValue=nv;
  });
  root.querySelectorAll('option').forEach(o=>{
    if(o.closest && (o.closest('.print-doc')||o.closest('#prevHost'))) return;
    const nv=window.L(o.textContent);
    if(nv!==o.textContent) o.textContent=nv;
  });
};
window.fuelLabel = function(s){
  const map={'فارغ':'fuelEmpty','ربع':'fuelQ','نصف':'fuelH','ممتلئ':'fuelF',empty:'fuelEmpty',quarter:'fuelQ',half:'fuelH',full:'fuelF'};
  return map[s]?t(map[s]):(s||'');
};
window.docLang = function(){
  const co = window.session && session.company;
  if(co && (co.country === 'DE' || co.id === 'de' || /AUTOSERVICE|Deutschland|Germany/i.test(co.name||''))) return 'de';
  if(co && co.country === 'ES') return 'es';
  return 'de';
};
window.applyUiLang = function(){
  const lang = (db && db.settings && db.settings.uiLang) || 'de';
  const rtl = window.WP_RTL.includes(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
};
window.langOptions = function(selected){
  return window.WP_LANGS.map(([code,name])=>`<option value="${code}" ${code===selected?'selected':''}>${name} (${code})</option>`).join('');
};
(function(){
  const more={
    en:{
      purchasesTitle:'Purchases',scanPurchase:'Scan / upload invoice',manualBuy:'+ Manual purchase',
      invCount:'Invoice count',purchaseTotal:'Purchase total',paid:'Paid',pending:'Pending',
      document:'Document',send:'Send',viewDoc:'View',deleteBtn:'Delete',
      pickCustomerFirst:'Select a customer first',scanScheinTitle:'Scan vehicle registration',
      pickSchein:'Choose a Fahrzeugschein / Zulassungsbescheinigung photo',
      ocrHint:'The image is read in the browser. Check data before saving.',
      readingSchein:'Reading registration...',ocrFail:'Could not read the document',
      ocrManual:'Automatic read failed. Enter data manually.',readData:'Read data',
      pickScheinFirst:'Choose or photograph the document first',
      katyParts:'Katy / Henry parts',skuEnter:'Part number then Enter',fetchBtn:'Fetch',
      pasteLines:'Paste one part per line: no. | desc | qty | price',pasteAdd:'Paste and add',
      katyHint:'1) Open Katy/Henry for the car. 2) Copy number+name+price. 3) Paste here.',
      invLinesLbl:'Invoice lines',colType:'Type',colSku:'Item',colDesc:'Description',
      colQty:'Qty',colPrice:'Price',colSum:'Sum',addParts:'+ Parts',addLaborBtn:'+ Labor',
      chooseCustomer:'Select customer',needLine:'Add at least one line',
      needDesc:'Every line needs a description',needQtyPrice:'Qty and price must be over zero',
      needCustomer:'Select a customer or a vehicle linked to a customer',
      saveShowDesign:'Save and preview',addedFrom:'Added from',
      notFoundLocal:'Not found locally. Complete name and price or open Katy.',
      needSku:'Enter a part number',maxWeight:'Max weight (kg)',seats:'Seats',vClass:'Vehicle class',
      readingAI:'Reading registration with AI...',ocrManual2:'Automatic read failed. Enter manually.',
      newCustShort:'New customer',scanOpenJob:'Scan registration — open job',
      kmNowEx:'Current mileage',repairNeeded:'Work required',saveOpenJob:'Save and open job',
      readPaper:'Read document',readFailClear:'Could not read. Take a clearer photo or enter manually.',
      enterKmSave:'Enter mileage then save',noPhotos:'No photos',
      showDesign:'Show design',newInv:'New invoice',noCar:'No vehicle',
      partsEuro:'Parts €',laborEuro:'Labor €',discEuro:'Discount €',taxPct2:'VAT %',
      quoteFee2:'Quote fee €',manualBuyTitle:'Manual purchase',notesItems:'Notes / items',
      delPurchase:'Delete purchase invoice?',scanBuy:'Scan / upload purchase invoice',
      clickFull:'Click for full view',supplierName:'Supplier name',netEuro:'Net €',taxEuro:'VAT €',
      saving:'Saving...',saveInv:'Save invoice',underMin:'Below minimum',limit:'min',
      scanExp:'Scan expense receipt',readingInv2:'Reading invoice...',expAdded:'Expense added',
      readAdd2:'Read and add',wsTrade:'Trade name',wsLegal:'Legal name',country:'Country',
      currency:'Currency',devStudio:'Developer studio',saveFailed:'Save failed'
    },
    de:{
      purchasesTitle:'Einkäufe',scanPurchase:'Beleg scannen / laden',manualBuy:'+ Manueller Einkauf',
      invCount:'Anzahl Belege',purchaseTotal:'Einkaufssumme',paid:'Bezahlt',pending:'Offen',
      document:'Beleg',send:'Senden',viewDoc:'Anzeigen',deleteBtn:'Löschen',
      pickCustomerFirst:'Zuerst einen Kunden wählen',scanScheinTitle:'Fahrzeugschein scannen',
      pickSchein:'Foto vom Fahrzeugschein / Zulassungsbescheinigung wählen',
      ocrHint:'Das Bild wird im Browser gelesen. Daten vor dem Speichern prüfen.',
      readingSchein:'Schein wird gelesen...',ocrFail:'Dokument konnte nicht gelesen werden',
      ocrManual:'Automatik fehlgeschlagen. Daten manuell eingeben.',readData:'Daten lesen',
      pickScheinFirst:'Zuerst Dokument wählen oder fotografieren',
      katyParts:'Katy- / Henry-Teile',skuEnter:'Teilenummer dann Enter',fetchBtn:'Abrufen',
      pasteLines:'Eine Position je Zeile: Nr. | Text | Menge | Preis',pasteAdd:'Einfügen und hinzufügen',
      katyHint:'1) Katy/Henry zum Fahrzeug öffnen. 2) Nr.+Name+Preis kopieren. 3) Hier einfügen.',
      invLinesLbl:'Rechnungspositionen',colType:'Art',colSku:'Pos.',colDesc:'Bezeichnung',
      colQty:'Menge',colPrice:'Preis',colSum:'Summe',addParts:'+ Teile',addLaborBtn:'+ Lohn',
      chooseCustomer:'Kunde wählen',needLine:'Mindestens eine Position',
      needDesc:'Jede Position braucht eine Bezeichnung',needQtyPrice:'Menge und Preis größer null',
      needCustomer:'Kunde oder zugeordnetes Fahrzeug wählen',
      saveShowDesign:'Speichern und Vorschau',addedFrom:'Übernommen aus',
      notFoundLocal:'Lokal nicht gefunden. Name und Preis ergänzen oder Katy öffnen.',
      needSku:'Teilenummer eingeben',maxWeight:'Zul. Gesamtmasse (kg)',seats:'Sitze',vClass:'Fahrzeugklasse',
      readingAI:'Schein wird per KI gelesen...',ocrManual2:'Automatik fehlgeschlagen. Manuell eingeben.',
      newCustShort:'Neuer Kunde',scanOpenJob:'Schein scannen — Auftrag öffnen',
      kmNowEx:'Aktueller km-Stand',repairNeeded:'Gewünschte Arbeit',saveOpenJob:'Speichern und Auftrag öffnen',
      readPaper:'Dokument lesen',readFailClear:'Lesen fehlgeschlagen. Schärferes Foto oder manuell.',
      enterKmSave:'km eingeben und speichern',noPhotos:'Keine Fotos',
      showDesign:'Layout zeigen',newInv:'Neue Rechnung',noCar:'Kein Fahrzeug',
      partsEuro:'Teile €',laborEuro:'Lohn €',discEuro:'Rabatt €',taxPct2:'MwSt. %',
      quoteFee2:'KV-Gebühr €',manualBuyTitle:'Manueller Einkauf',notesItems:'Notizen / Positionen',
      delPurchase:'Einkaufsbeleg löschen?',scanBuy:'Einkaufsbeleg scannen / laden',
      clickFull:'Für Vollansicht klicken',supplierName:'Lieferant',netEuro:'Netto €',taxEuro:'MwSt. €',
      saving:'Speichern...',saveInv:'Beleg speichern',underMin:'Unter Mindestbestand',limit:'Min.',
      scanExp:'Ausgabenbeleg scannen',readingInv2:'Beleg wird gelesen...',expAdded:'Ausgabe hinzugefügt',
      readAdd2:'Lesen und hinzufügen',wsTrade:'Handelsname',wsLegal:'Rechtsname',country:'Land',
      currency:'Währung',devStudio:'Entwicklerstudio',saveFailed:'Speichern fehlgeschlagen'
    },
    ar:{
      purchasesTitle:'المشتريات',scanPurchase:'تصوير / رفع فاتورة',manualBuy:'+ شراء يدوي',
      invCount:'عدد الفواتير',purchaseTotal:'إجمالي المشتريات',paid:'مدفوع',pending:'معلق',
      document:'المستند',send:'إرسال',viewDoc:'عرض',deleteBtn:'حذف',
      pickCustomerFirst:'اختر عميلاً أولاً',scanScheinTitle:'تصوير/رفع ورقة السيارة',
      pickSchein:'اختر صورة Fahrzeugschein / Zulassungsbescheinigung',
      ocrHint:'تتم قراءة الصورة في المتصفح. راجع البيانات قبل الحفظ.',
      readingSchein:'جارٍ قراءة ورقة السيارة...',ocrFail:'تعذرت قراءة ورقة السيارة',
      ocrManual:'تعذرت القراءة التلقائية. أدخل البيانات يدوياً.',readData:'قراءة البيانات',
      pickScheinFirst:'اختر أو صوّر الورقة أولاً',
      katyParts:'قطع Katy / Henry',skuEnter:'رقم القطعة ثم Enter',fetchBtn:'جلب',
      pasteLines:'الصق سطراً لكل قطعة: رقم | وصف | عدد | سعر',pasteAdd:'لصق وإضافة للجدول',
      katyHint:'1) افتح Katy/Henry بالسيارة. 2) انسخ رقم+اسم+سعر. 3) الصق هنا.',
      invLinesLbl:'بنود الفاتورة',colType:'النوع',colSku:'البند',colDesc:'الوصف',
      colQty:'العدد',colPrice:'السعر',colSum:'المجموع',addParts:'+ قطع غيار',addLaborBtn:'+ أجور عمالة',
      chooseCustomer:'اختر العميل',needLine:'أضف بند واحد على الأقل',
      needDesc:'كل بند يحتاج وصف',needQtyPrice:'العدد والسعر لازم أكبر من صفر',
      needCustomer:'اختر العميل أو سيارة مربوطة بعميل',
      saveShowDesign:'حفظ وعرض التصميم',addedFrom:'تمت الإضافة من',
      notFoundLocal:'ما انوجدت محلياً. كمّل الاسم والسعر أو افتح Katy.',
      needSku:'أدخل رقم القطعة',maxWeight:'الوزن الأقصى (kg)',seats:'عدد المقاعد',vClass:'فئة المركبة',
      readingAI:'جارٍ قراءة ورقة السيارة بالذكاء الاصطناعي...',ocrManual2:'تعذرت القراءة التلقائية. أدخل يدوياً.',
      newCustShort:'زبون جديد',scanOpenJob:'تصوير ورقة السيارة — فتح أمر',
      kmNowEx:'الكيلومتر الحالي',repairNeeded:'وصف التصليح المطلوب',saveOpenJob:'حفظ وفتح الأمر',
      readPaper:'قراءة الورقة',readFailClear:'تعذرت القراءة. صوّر أوضح أو أدخل يدوياً.',
      enterKmSave:'أدخل الكم ثم اضغط حفظ',noPhotos:'لا صور',
      showDesign:'عرض التصميم',newInv:'فاتورة جديدة',noCar:'بدون سيارة',
      partsEuro:'القطع €',laborEuro:'الأجور €',discEuro:'الخصم €',taxPct2:'الضريبة %',
      quoteFee2:'رسوم التقدير €',manualBuyTitle:'شراء يدوي',notesItems:'ملاحظات / الأصناف',
      delPurchase:'حذف فاتورة الشراء؟',scanBuy:'تصوير / رفع فاتورة شراء',
      clickFull:'اضغط للعرض الكامل',supplierName:'اسم المورد',netEuro:'الصافي €',taxEuro:'الضريبة €',
      saving:'جاري الحفظ...',saveInv:'حفظ الفاتورة',underMin:'تحت الحد الأدنى',limit:'حد',
      scanExp:'تصوير فاتورة مصروف',readingInv2:'جاري قراءة الفاتورة...',expAdded:'تمت إضافة المصروف',
      readAdd2:'قراءة وإضافة',wsTrade:'الاسم التجاري',wsLegal:'الاسم القانوني',country:'الدولة',
      currency:'العملة',devStudio:'استوديو التطوير',saveFailed:'فشل الحفظ'
    }
  };
  ['en','de','ar'].forEach(c=>{ if(WP_I18N[c]) Object.assign(WP_I18N[c], more[c]); });
  ['tr','sr','ru','pl','es'].forEach(c=>{
    if(WP_I18N[c] && WP_I18N.de) WP_I18N[c]=Object.assign({}, WP_I18N.de, WP_I18N[c]);
  });
})();
window.payLabel=function(p){
  const m={'open':'payOpen','offen':'payOpen','غير محدد':'payOpen','cash':'payCash','نقدي':'payCash','Bar':'payCash','card':'payCard','بطاقة':'payCard','bank':'payBank','تحويل بنكي':'payBank'};
  return m[p]?t(m[p]):(p||'');
};
window.payCode=function(p){
  if(['cash','نقدي',t('payCash')].includes(p)) return 'cash';
  if(['card','بطاقة',t('payCard')].includes(p)) return 'card';
  if(['bank','تحويل بنكي',t('payBank')].includes(p)) return 'bank';
  return 'open';
};
