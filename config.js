const CONFIG = {
    SUPABASE_URL: 'https://xwkmhpcombsauoozyidi.supabase.co',
    SUPABASE_KEY: 'sb_publishable_5iDJi-xK69y1DM0nFYjqlw_TaozemSt',
    RESTAURANT_ID: 'c8b81ead-daa9-4406-ad2e-e02e3a372577',

};

// Cliente Global de Supabase
//para obtener el SUPABASE_KEY voy a https://supabase.com/dashboard/project/mvtatdvpsjynvayhhksc/settings/api-keys?showConnect=true&connectTab=frameworks 
//entonce NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_XtV2kYHISXME2K-STuHmdw_UUGTZyvS
//SUPABASE_URL https://supabase.com/dashboard/project/mvtatdvpsjynvayhhksc/settings/api ====== Project URL
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);






