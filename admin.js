// admin.js - VERSIÓN EL REAL

let inventarioGlobal = []; 

// 1. CHEQUEO DE SESIÓN
async function checkAuth() {
    try {
        if (typeof supabaseClient === 'undefined') {
            console.error("Supabase no detectado");
            return;
        }
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = "login.html";
        } else {
            cargarAdmin();
        }
    } catch (err) {
        console.error("Error en Auth:", err);
    }
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

// 2. CARGAR PRODUCTOS
async function cargarAdmin() {
    const lista = document.getElementById('lista-admin');
    const contador = document.getElementById('contador-productos');
    if (!lista) return;

    lista.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">⟳ Cargando inventario...</div>';

    try {
        if (typeof CONFIG === 'undefined' || !CONFIG.RESTAURANT_ID) {
            throw new Error("ID de restaurante no configurado");
        }

        let { data: productos, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('activo', true)
            .eq('restaurant_id', CONFIG.RESTAURANT_ID) 
            .order('id', { ascending: false });

        if (error) throw error;
        
        inventarioGlobal = productos || [];

        if (contador) contador.textContent = `${inventarioGlobal.length} items`;

        if (inventarioGlobal.length === 0) {
            lista.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">Inventario vacío. Agrega tu primer plato.</p>';
            return;
        }

        // GENERAR HTML
        lista.innerHTML = inventarioGlobal.map(item => {
            const esAgotado = item.estado === 'agotado';
            
            // COLOR ROSA PARA DESTACADO EL REAL (#ff007f)
            const starColor = item.destacado ? '#ff007f' : '#444'; 
            
            return `
                <div class="inventory-item">
                    <img src="${item.imagen_url || 'https://via.placeholder.com/60'}" 
                         class="item-thumb" 
                         onerror="this.src='https://via.placeholder.com/60'">
                    
                    <div class="item-meta">
                        <span class="item-title">${item.nombre} ${item.destacado ? '👑' : ''}</span>
                        <span class="item-price">$${item.precio}</span>
                        <span class="item-status ${esAgotado ? 'status-bad' : 'status-ok'}">
                            ${esAgotado ? 'AGOTADO' : 'DISPONIBLE'}
                        </span>
                    </div>

                    <div class="action-btn-group">
                        <button class="icon-btn" onclick="prepararEdicion(${item.id})"><span class="material-icons">edit</span></button>
                        
                        <button class="icon-btn" style="color:${starColor}; border-color:${item.destacado ? '#ff007f' : 'transparent'}" 
                                onclick="toggleDestacado(${item.id}, ${item.destacado})" title="Destacar">
                                <span class="material-icons">star</span>
                        </button>
                        
                        <button class="icon-btn" onclick="toggleEstado(${item.id}, '${item.estado}')" title="Disponible/Agotado">
                            <span class="material-icons">${esAgotado ? 'toggle_off' : 'toggle_on'}</span>
                        </button>
                        
                        <button class="icon-btn btn-del" onclick="eliminarProducto(${item.id})">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Fallo:", err);
        lista.innerHTML = `<p style="color:#ff5252; padding:20px;">Error: ${err.message}</p>`;
    }
}

// 3. GUARDAR / EDITAR
const form = document.getElementById('form-producto');
if(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit');
        const idEdicion = document.getElementById('edit-id').value;
        
        btn.textContent = "Guardando..."; btn.disabled = true;

        try {
            const fileInput = document.getElementById('imagen-file');
            let urlImagen = null;

            if (fileInput && fileInput.files.length > 0) {
                const archivo = fileInput.files[0];
                const nombreArchivo = `real_${Date.now()}.${archivo.name.split('.').pop()}`;
                const { error: upErr } = await supabaseClient.storage.from('imagenes').upload(nombreArchivo, archivo);
                if (upErr) throw upErr;
                const { data } = supabaseClient.storage.from('imagenes').getPublicUrl(nombreArchivo);
                urlImagen = data.publicUrl;
            }

            const datos = {
                nombre: document.getElementById('nombre').value,
                precio: parseFloat(document.getElementById('precio').value),
                categoria: document.getElementById('categoria').value,
                descripcion: document.getElementById('descripcion').value,
                destacado: document.getElementById('destacado').checked,
                restaurant_id: CONFIG.RESTAURANT_ID
            };

            if (urlImagen) datos.imagen_url = urlImagen;

            const { error } = idEdicion 
                ? await supabaseClient.from('productos').update(datos).eq('id', idEdicion)
                : await supabaseClient.from('productos').insert([{...datos, estado: 'disponible', activo: true}]);

            if (error) throw error;
            
            alert(idEdicion ? "Producto actualizado" : "Producto creado");
            cancelarEdicion();
            cargarAdmin();
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            btn.textContent = idEdicion ? "ACTUALIZAR PRODUCTO" : "GUARDAR PRODUCTO";
            btn.disabled = false;
        }
    });
}

function prepararEdicion(id) {
    const p = inventarioGlobal.find(p => p.id === id);
    if (!p) return;

    document.getElementById('edit-id').value = p.id;
    document.getElementById('nombre').value = p.nombre;
    document.getElementById('precio').value = p.precio;
    
    // --- ESTA ES LA PARTE QUE ARREGLA EL ERROR ---
    // Convierte lo que viene de la base de datos a minúsculas para que coincida con tu selector
    let categoriaLimpia = (p.categoria || "").toString();
    document.getElementById('categoria').value = categoriaLimpia.toLowerCase().trim();
    // ---------------------------------------------

    document.getElementById('descripcion').value = p.descripcion || '';
    document.getElementById('destacado').checked = p.destacado;

    const preview = document.getElementById('imagen-preview');
    const prompt = document.getElementById('upload-prompt');
    if (preview && p.imagen_url) {
        preview.src = p.imagen_url;
        preview.style.display = 'block';
        if (prompt) prompt.style.display = 'none';
    }

    document.getElementById('btn-submit').textContent = "ACTUALIZAR PRODUCTO";
    document.getElementById('btn-cancelar').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
    if (form) form.reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('btn-submit').textContent = "GUARDAR PRODUCTO";
    document.getElementById('btn-cancelar').style.display = "none";
    const preview = document.getElementById('imagen-preview');
    const prompt = document.getElementById('upload-prompt');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (prompt) prompt.style.display = 'block';
}

async function toggleDestacado(id, valor) {
    await supabaseClient.from('productos').update({ destacado: !valor }).eq('id', id);
    cargarAdmin();
}
async function toggleEstado(id, est) {
    const nuevo = est === 'disponible' ? 'agotado' : 'disponible';
    await supabaseClient.from('productos').update({ estado: nuevo }).eq('id', id);
    cargarAdmin();
}
async function eliminarProducto(id) {
    if(confirm("¿Eliminar definitivamente?")) {
        await supabaseClient.from('productos').update({ activo: false }).eq('id', id);
        cargarAdmin();
    }
}

// Vista previa de imagen
document.addEventListener('change', (e) => {
    if (e.target.id === 'imagen-file') {
        const file = e.target.files[0];
        const preview = document.getElementById('imagen-preview');
        const prompt = document.getElementById('upload-prompt');
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.src = ev.target.result;
                preview.style.display = 'block';
                if (prompt) prompt.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }
});

// Buscador
document.getElementById('buscadorInventario').addEventListener('input', function(e) {
    const texto = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('.inventory-item');
    items.forEach(item => {
        const contenido = item.innerText.toLowerCase();
        item.style.display = contenido.includes(texto) ? "flex" : "none";
    });
});

document.addEventListener('DOMContentLoaded', checkAuth);
// --- LÓGICA DEL TELÉFONO (Corregida) ---

async function cargarTelefono() {
    // Usamos 'supabaseClient' (que es tu variable real)
    const { data, error } = await supabaseClient
        .from('configuracion')
        .select('valor')              // 1. Pedimos la columna 'valor'
        .eq('clave', 'telefono_pedidos') // 2. Filtramos por la clave
        .single();
    
    if (data) {
        document.getElementById('config-telefono').value = data.valor;
    } else {
        console.log("No se encontró teléfono guardado o hubo error:", error);
    }
}

async function guardarTelefono() {
    const nuevoTel = document.getElementById('config-telefono').value;
    if (!nuevoTel) return alert("Escribe un número");

    // Usamos 'supabaseClient'
    const { error } = await supabaseClient
        .from('configuracion')
        .update({ valor: nuevoTel })      // 1. Actualizamos la columna 'valor'
        .eq('clave', 'telefono_pedidos'); // 2. Donde la clave sea el teléfono

    if (error) {
        console.error("Error Supabase:", error);
        alert("❌ Error al guardar: " + error.message);
    } else {
        alert("✅ ¡Teléfono actualizado correctamente!");
    }
}

// Inicializar

document.addEventListener('DOMContentLoaded', cargarTelefono);
