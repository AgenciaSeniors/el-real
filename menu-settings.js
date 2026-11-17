// Shared, restaurant-scoped settings. Public reads use the existing Supabase client.
const MenuSettings = {
    defaults: [{"id": "entrantes", "nombre": "Entrantes"}, {"id": "cafes", "nombre": "Cafés"}, {"id": "sugerencias del chef", "nombre": "Sugerencias del Chef"}, {"id": "completas", "nombre": "Completas"}, {"id": "guarniciones", "nombre": "Guarniciones"}, {"id": "cerdo", "nombre": "Cerdo"}, {"id": "res", "nombre": "Res"}, {"id": "pollo", "nombre": "Pollo"}, {"id": "pescados", "nombre": "Pescados"}, {"id": "mariscos", "nombre": "Mariscos"}, {"id": "pizzas", "nombre": "Pizzas"}, {"id": "lasaña", "nombre": "Lasaña"}, {"id": "spaghettis", "nombre": "Spaghettis"}, {"id": "bebidas s/a", "nombre": "Bebidas S/A"}, {"id": "cervezas", "nombre": "Cervezas"}, {"id": "cocteles", "nombre": "Cocteles"}, {"id": "vinos", "nombre": "Vinos"}, {"id": "tragos", "nombre": "Tragos"}, {"id": "cremas", "nombre": "Cremas"}, {"id": "postres", "nombre": "Postres"}, {"id": "picaderas", "nombre": "Picaderas"}, {"id": "agregados", "nombre": "Agregados"}],
    normalize: value => String(value || '').trim().toLocaleLowerCase('es'),
    escape: value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c])),
    key: name => `menu_${CONFIG.RESTAURANT_ID}_${name}`,
    async read(name) {
        const {data, error} = await supabaseClient.from('configuracion').select('valor').eq('clave', this.key(name)).maybeSingle();
        if (error) throw error;
        return data ? JSON.parse(data.valor) : null;
    },
    async write(name, value) {
        const clave = this.key(name);
        const {data: existing, error: readError} = await supabaseClient.from('configuracion').select('clave').eq('clave', clave).maybeSingle();
        if (readError) throw readError;
        const payload = {valor: JSON.stringify(value)};
        const query = existing
            ? supabaseClient.from('configuracion').update(payload).eq('clave', clave)
            : supabaseClient.from('configuracion').insert({clave, ...payload});
        const {data, error} = await query.select('clave');
        if (error) throw error;
        if (!data?.length) throw new Error('No se guardó el cambio. Comprueba los permisos de configuración.');
    }
};
