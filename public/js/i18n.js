import {arabicPhrases} from './phrases.js?v=20260912-i18n';
// Internationalization: English + Arabic (RTL)
export const translations = {
  en: {
    pos_system: 'Point of Sale System',
    username: 'Username', password: 'Password', login: 'Login', logout: 'Logout',
    dashboard: 'Dashboard', pos: 'POS', invoices: 'Invoices', products: 'Products',
    gaming: 'Gaming', inventory: 'Inventory', debtors: 'Debtors', shifts: 'Shifts', expenses: 'Expenses',
    reports: 'Reports', search: 'Search', settings: 'Settings',

    todays_sales: "Today's Sales", todays_profit: "Today's Profit",
    customers_today: 'Customers Today', games_sold_today: 'Games Sold Today',
    product_revenue: 'Product Revenue', gaming_revenue: 'Gaming Revenue',
    outstanding_debts: 'Outstanding Debts', low_stock_alerts: 'Low Stock Alerts',
    best_selling: 'Best Selling Products', recent_transactions: 'Recent Transactions',
    sales_trend: '7-Day Sales Trend', invoices_count: 'Invoices Today',
    no_data: 'No data yet', no_low_stock: 'All stock levels are healthy',

    new_invoice: 'New Invoice', customer_name: 'Customer Name', add_product: 'Products',
    add_gaming: 'Gaming', quantity: 'Qty', unit_price: 'Unit Price', total: 'Total',
    subtotal: 'Subtotal', discount: 'Discount', notes: 'Notes', payment_status: 'Payment Status',
    paid: 'Paid', unpaid: 'Unpaid', save_invoice: 'Save Invoice', cart_empty: 'Cart is empty',
    add_items_hint: 'Tap products or gaming items to add them', clear: 'Clear',
    grand_total: 'Grand Total', invoice_saved: 'Invoice saved', in_stock: 'in stock',
    out_of_stock: 'Out of stock', enter_customer: 'Enter customer name',

    add_product_btn: 'Add Product', edit: 'Edit', delete: 'Delete', name: 'Name',
    name_ar: 'Name (Arabic)', category: 'Category', purchase_price: 'Purchase Price',
    selling_price: 'Selling Price', stock: 'Stock', min_stock: 'Min Stock', image: 'Image',
    save: 'Save', cancel: 'Cancel', type: 'Type', product: 'Product', restock: 'Restock',
    add_category: 'Add Category', categories: 'Categories', all_categories: 'All Categories',
    optional: 'optional', confirm_delete: 'Are you sure you want to delete this?',
    upload_image: 'Upload Image', add_gaming_btn: 'Add Gaming Item', gaming_items: 'Gaming Items',

    current_stock: 'Current Stock', inventory_value: 'Inventory Value',
    retail_value: 'Retail Value', stock_history: 'Stock History', out_stock_alert: 'Out of Stock',
    low_stock: 'Low Stock', change: 'Change', reason: 'Reason', balance: 'Balance', date: 'Date',
    value: 'Value',

    debt_amount: 'Debt Amount', paid_amount: 'Paid', remaining: 'Remaining', status: 'Status',
    mark_paid: 'Mark Paid', add_debtor: 'Add Debtor', payment_history: 'Payment History',
    record_payment: 'Record Payment', amount: 'Amount', partial: 'Partial', pay: 'Pay',
    all: 'All',
    send_to_debtors: 'Send to Debtors', sent_to_debtors: 'Sent to Debtors',
    open_orders: 'Open Orders', no_open_orders: 'No open orders',
    save_open_order: 'Add / Save Order', open_order_saved: 'Order saved',
    new_order: 'New Order', confirm_paid: 'Confirm Paid', confirm_debt: 'Confirm Debt',
    open_shift: 'Open Shift', close_shift: 'Close Shift', shift_status: 'Shift Status',
    shift_opened: 'Shift opened', shift_closed: 'Shift closed', shift_history: 'Shift History',
    opening_cash: 'Opening Cash', closing_cash: 'Closing Cash', expected_cash: 'Expected Cash',
    paid_sales: 'Paid Sales', difference: 'Difference', open: 'Open', closed: 'Closed',
    opened_by: 'Opened By', opened_at: 'Opened At',

    add_expense: 'Add Expense', electricity: 'Electricity', internet: 'Internet',
    rent: 'Rent', maintenance: 'Maintenance', other: 'Other', description: 'Description',
    total_expenses: 'Total Expenses',

    daily: 'Daily', monthly: 'Monthly', yearly: 'Yearly', total_sales: 'Total Sales',
    total_profit: 'Total Profit', net_profit: 'Net Profit', gross_profit: 'Gross Profit',
    product_sales: 'Product Sales', gaming_sales: 'Gaming Sales', export_pdf: 'Export PDF',
    export_excel: 'Export Excel', report: 'Report', generate: 'Generate',

    search_placeholder: 'Search invoices, customers, products, debtors...',
    results: 'Results', no_results: 'No results found',

    cafe_name: 'Cafe Name', cafe_logo: 'Cafe Logo', currency: 'Currency',
    default_game_price: 'Default Game Price', low_stock_alert_level: 'Low Stock Alert Level',
    language: 'Language', dark_mode: 'Dark Mode', backup: 'Backup Database',
    restore: 'Restore Database', export_backup: 'Export Backup', import_backup: 'Import Backup',
    change_password: 'Change Password', current_password: 'Current Password',
    new_password: 'New Password', session_timeout: 'Session Timeout (minutes)',
    general: 'General', security: 'Security', apply_to_one_game: 'Apply to "One Game" item',
    settings_saved: 'Settings saved', backup_restored: 'Backup restored successfully',
    restore_warning: 'This will replace ALL current data. Continue?',

    invoice_no: 'Invoice #', view: 'View', actions: 'Actions', close: 'Close',
    print: 'Print', qty_sold: 'Qty Sold', revenue: 'Revenue', today: 'Today',
    yes: 'Yes', no: 'No', apply: 'Apply', from: 'From', to: 'To',
    loading: 'Loading...', error_occurred: 'An error occurred', required_field: 'This field is required',
    session_expired: 'Session expired, please login again'
  },
  ar: {
    pos_system: 'نظام نقاط البيع',
    username: 'اسم المستخدم', password: 'كلمة المرور', login: 'دخول', logout: 'خروج',
    dashboard: 'لوحة التحكم', pos: 'نقطة البيع', invoices: 'الفواتير', products: 'المنتجات',
    gaming: 'الألعاب', inventory: 'المخزون', debtors: 'الديون', shifts: 'الشفتات', expenses: 'المصاريف',
    reports: 'التقارير', search: 'بحث', settings: 'الإعدادات',

    todays_sales: 'مبيعات اليوم', todays_profit: 'ربح اليوم',
    customers_today: 'زبائن اليوم', games_sold_today: 'ألعاب مباعة اليوم',
    product_revenue: 'إيراد المنتجات', gaming_revenue: 'إيراد الألعاب',
    outstanding_debts: 'الديون المستحقة', low_stock_alerts: 'تنبيهات المخزون',
    best_selling: 'الأكثر مبيعاً', recent_transactions: 'آخر العمليات',
    sales_trend: 'مبيعات آخر ٧ أيام', invoices_count: 'فواتير اليوم',
    no_data: 'لا توجد بيانات', no_low_stock: 'كل مستويات المخزون جيدة',

    new_invoice: 'فاتورة جديدة', customer_name: 'اسم الزبون', add_product: 'المنتجات',
    add_gaming: 'الألعاب', quantity: 'الكمية', unit_price: 'سعر الوحدة', total: 'المجموع',
    subtotal: 'المجموع الفرعي', discount: 'الخصم', notes: 'ملاحظات', payment_status: 'حالة الدفع',
    paid: 'مدفوع', unpaid: 'غير مدفوع', save_invoice: 'حفظ الفاتورة', cart_empty: 'السلة فارغة',
    add_items_hint: 'اضغط على المنتجات أو الألعاب لإضافتها', clear: 'مسح',
    grand_total: 'الإجمالي', invoice_saved: 'تم حفظ الفاتورة', in_stock: 'متوفر',
    out_of_stock: 'نفذ المخزون', enter_customer: 'أدخل اسم الزبون',

    add_product_btn: 'إضافة منتج', edit: 'تعديل', delete: 'حذف', name: 'الاسم',
    name_ar: 'الاسم (عربي)', category: 'الفئة', purchase_price: 'سعر الشراء',
    selling_price: 'سعر البيع', stock: 'المخزون', min_stock: 'الحد الأدنى', image: 'صورة',
    save: 'حفظ', cancel: 'إلغاء', type: 'النوع', product: 'منتج', restock: 'إضافة مخزون',
    add_category: 'إضافة فئة', categories: 'الفئات', all_categories: 'كل الفئات',
    optional: 'اختياري', confirm_delete: 'هل أنت متأكد من الحذف؟',
    upload_image: 'رفع صورة', add_gaming_btn: 'إضافة لعبة', gaming_items: 'أصناف الألعاب',

    current_stock: 'المخزون الحالي', inventory_value: 'قيمة المخزون',
    retail_value: 'قيمة البيع', stock_history: 'سجل المخزون', out_stock_alert: 'نفذ المخزون',
    low_stock: 'مخزون منخفض', change: 'التغيير', reason: 'السبب', balance: 'الرصيد', date: 'التاريخ',
    value: 'القيمة',

    debt_amount: 'مبلغ الدين', paid_amount: 'المدفوع', remaining: 'المتبقي', status: 'الحالة',
    mark_paid: 'تسديد', add_debtor: 'إضافة دين', payment_history: 'سجل الدفعات',
    record_payment: 'تسجيل دفعة', amount: 'المبلغ', partial: 'جزئي', pay: 'دفع',
    all: 'الكل',
    send_to_debtors: 'إرسال إلى الديون', sent_to_debtors: 'أُرسل إلى الديون',
    open_orders: 'طلبات مفتوحة', no_open_orders: 'لا توجد طلبات مفتوحة',
    save_open_order: 'إضافة / حفظ الطلب', open_order_saved: 'تم حفظ الطلب',
    new_order: 'طلب جديد', confirm_paid: 'تأكيد الدفع', confirm_debt: 'تأكيد الدين',
    open_shift: 'فتح الشفت', close_shift: 'إغلاق الشفت', shift_status: 'حالة الشفت',
    shift_opened: 'تم فتح الشفت', shift_closed: 'تم إغلاق الشفت', shift_history: 'سجل الشفتات',
    opening_cash: 'كاش البداية', closing_cash: 'كاش الإغلاق', expected_cash: 'الكاش المتوقع',
    paid_sales: 'المبيعات المدفوعة', difference: 'الفرق', open: 'مفتوح', closed: 'مغلق',
    opened_by: 'فتح بواسطة', opened_at: 'وقت الفتح',

    add_expense: 'إضافة مصروف', electricity: 'كهرباء', internet: 'إنترنت',
    rent: 'إيجار', maintenance: 'صيانة', other: 'أخرى', description: 'الوصف',
    total_expenses: 'إجمالي المصاريف',

    daily: 'يومي', monthly: 'شهري', yearly: 'سنوي', total_sales: 'إجمالي المبيعات',
    total_profit: 'إجمالي الربح', net_profit: 'صافي الربح', gross_profit: 'الربح الإجمالي',
    product_sales: 'مبيعات المنتجات', gaming_sales: 'مبيعات الألعاب', export_pdf: 'تصدير PDF',
    export_excel: 'تصدير Excel', report: 'تقرير', generate: 'إنشاء',

    search_placeholder: 'ابحث عن فواتير، زبائن، منتجات، ديون...',
    results: 'النتائج', no_results: 'لا توجد نتائج',

    cafe_name: 'اسم الكافيه', cafe_logo: 'شعار الكافيه', currency: 'العملة',
    default_game_price: 'سعر اللعبة الافتراضي', low_stock_alert_level: 'حد تنبيه المخزون',
    language: 'اللغة', dark_mode: 'الوضع الليلي', backup: 'نسخ احتياطي',
    restore: 'استعادة', export_backup: 'تصدير نسخة', import_backup: 'استيراد نسخة',
    change_password: 'تغيير كلمة المرور', current_password: 'كلمة المرور الحالية',
    new_password: 'كلمة المرور الجديدة', session_timeout: 'مهلة الجلسة (دقائق)',
    general: 'عام', security: 'الأمان', apply_to_one_game: 'تطبيق على صنف "لعبة واحدة"',
    settings_saved: 'تم حفظ الإعدادات', backup_restored: 'تمت الاستعادة بنجاح',
    restore_warning: 'سيتم استبدال كل البيانات الحالية. هل تريد المتابعة؟',

    invoice_no: 'رقم الفاتورة', view: 'عرض', actions: 'إجراءات', close: 'إغلاق',
    print: 'طباعة', qty_sold: 'الكمية المباعة', revenue: 'الإيراد', today: 'اليوم',
    yes: 'نعم', no: 'لا', apply: 'تطبيق', from: 'من', to: 'إلى',
    loading: 'جاري التحميل...', error_occurred: 'حدث خطأ', required_field: 'هذا الحقل مطلوب',
    session_expired: 'انتهت الجلسة، الرجاء تسجيل الدخول مجدداً'
  }
};

// Start each page load in Arabic; the language button switches the active session.
let currentLang = 'ar';

export function getLang() { return currentLang; }

export function t(key, values = {}) {
  let result = currentLang === 'ar'
    ? (translations.ar[key] || arabicPhrases[key] || translations.en[key] || key)
    : (translations.en[key] || key);
  return String(result).replace(/\{(\w+)\}/g, (match, name) => values[name] === undefined ? match : String(values[name]));
}

export function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'ar';
  const app = document.getElementById('app');
  const login = document.getElementById('login-screen');
  const loggedIn = login?.classList.contains('hidden');
  document.documentElement.lang = loggedIn ? currentLang : 'en';
  document.documentElement.dir = loggedIn && currentLang === 'ar' ? 'rtl' : 'ltr';
  if(app){app.lang=currentLang;app.dir=currentLang==='ar'?'rtl':'ltr';}
  if(login){login.lang='en';login.dir='ltr';}
  const button=document.getElementById('quick-lang');
  if(button){button.textContent=currentLang==='ar'?'English':'العربية';button.title=currentLang==='ar'?'Switch to English':'التبديل إلى العربية';}
  applyStaticTranslations();
}

export function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if(!el.closest('#login-screen')) el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    if(!el.closest('#login-screen')) el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
}
