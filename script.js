// script.js - VERSIÓN EL REAL

let searchTimeout;
let todosLosProductos = [];
let productoActual = null;
let puntuacionSeleccionada = 0;

// 1. CARGAR MENÚ
async function cargarMenu() {
    const grid = document.getElementById('menu-grid');
    if (grid) grid.innerHTML = '<p style="text-align:center; color:#888; grid-column:1/-1; padding:40px;">Cargando carta...</p>';

    try {
        if (typeof supabaseClient === 'undefined') {
            throw new Error("Error: Supabase no está conectado.");
        }

        let { data: productos, error } = await supabaseClient
            .from('productos')
            .select(`*, opiniones(puntuacion)`)
            .eq('activo', true)
            .eq('restaurant_id', CONFIG.RESTAURANT_ID) 
            .order('categoria', { ascending: true })
            .order('destacado', { ascending: false })
            .order('id', { ascending: false });

        if (error) throw error;

        todosLosProductos = productos.map(prod => {
            const opiniones = prod.opiniones || [];
            const total = opiniones.length;
            const suma = opiniones.reduce((acc, curr) => acc + curr.puntuacion, 0);
            prod.ratingPromedio = total ? (suma / total).toFixed(1) : null;
            return prod;
        });

    } catch (err) {
        console.error("Error cargando:", err);
    }

    renderizarMenu(todosLosProductos);
}

// 2. RENDERIZAR
function renderizarMenu(productos) {
    const contenedor = document.getElementById('menu-grid');
    if (!contenedor) return;
    
    contenedor.style.display = 'block'; 
    contenedor.innerHTML = ''; // Limpiamos el menú

    // 1. Definición de Iconos y Nombres para las Categorías
    const categoriasDefinidas = {
        'entrantes': { nombre: 'Entrantes', icono: '🍢' },
        'sugerencias del chef': { nombre: 'Sugerencias del Chef', icono: '👨‍🍳' },
        'completas': { nombre: 'Completas', icono: '🍽️' },
        'cerdo': { nombre: 'Cerdo', icono: '🍖' },
        'res': { nombre: 'Res', icono: '🥩' },
        'pollo': { nombre: 'Pollo', icono: '🍗' },
        'pescados': { nombre: 'Pescados y Mariscos', icono: '🐟' },
        'pizzas': { nombre: 'Pizzas', icono: '🍕' },
        'spaguettis': { nombre: 'Spaguettis', icono: '🍝' },
        'lasaña': { nombre: 'Lasaña', icono: '🥘' },
        'guarniciones': { nombre: 'Guarniciones', icono: '🍚' },
        'postres': { nombre: 'Postres', icono: '🍰' },
        'cafes': { nombre: 'Cafés', icono: '☕' },
        'cervezas': { nombre: 'Cervezas', icono: '🍺' },
        'cocteles': { nombre: 'Cocteles', icono: '🍸' },
        'vinos': { nombre: 'Vinos', icono: '🍷' },
        'tragos': { nombre: 'Tragos', icono: '🥃' },
        'cremas': { nombre: 'Cremas', icono: '🍶' },
        'picaderas': { nombre: 'Picaderas', icono: '🥨' },
        'bebidas': { nombre: 'Bebidas', icono: '🥤' }
    };

    // 2. Agrupar productos por categoría
    const categoriasAgrupadas = {};
    productos.forEach(item => {
        const cat = item.categoria.toLowerCase();
        if (!categoriasAgrupadas[cat]) {
            categoriasAgrupadas[cat] = [];
        }
        categoriasAgrupadas[cat].push(item);
    });

    // 3. Determinar el orden de las categorías según el Modo
    let llavesOrdenadas = Object.keys(categoriasAgrupadas);
    const esModoBar = document.getElementById('toggle-bar')?.checked;

    if (esModoBar) {
        // Orden de prioridad para el BAR
        const ordenBar = ['cervezas', 'cocteles', 'vinos', 'tragos', 'cremas', 'picaderas', 'bebidas'];
        llavesOrdenadas.sort((a, b) => {
            const indexA = ordenBar.indexOf(a);
            const indexB = ordenBar.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0;
        });
    } else {
        // Orden de prioridad para el RESTAURANTE
        const ordenRest = ['entrantes', 'sugerencias del chef', 'completas', 'cerdo', 'res', 'pollo', 'pescados', 'pizzas', 'spaguettis', 'lasaña', 'guarniciones', 'postres', 'cafes'];
        llavesOrdenadas.sort((a, b) => {
            const indexA = ordenRest.indexOf(a);
            const indexB = ordenRest.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return 0;
        });
    }

    // 4. Renderizar cada sección en el orden establecido
    llavesOrdenadas.forEach(catKey => {
        const productosCategoria = categoriasAgrupadas[catKey];
        const infoCat = categoriasDefinidas[catKey] || { nombre: catKey, icono: '🍽️' };
        
        // Enlace de tu logo en Supabase para cuando no haya foto
        const LOGO_DEFECTO = 'TU_ENLACE_DE_SUPABASE_AQUI'; 

        const seccionHTML = `
            <section class="menu-section" id="cat-${catKey}">
                <h2 class="category-title">${infoCat.icono} ${infoCat.nombre}</h2>
                <div class="products-grid">
                    ${productosCategoria.map(item => `
                        <div class="card-real">
                            <div class="card-img-container">
                                <img src="${item.imagen_url || LOGO_DEFECTO}" 
                                     alt="${item.nombre}" 
                                     onerror="this.src='${LOGO_DEFECTO}'"
                                     loading="lazy">
                            </div>
                            <div class="card-body">
                                <h3 class="item-name">${item.nombre}</h3>
                                <p class="item-description">${item.descripcion || ''}</p>
                                <div class="card-footer">
                                    <span class="item-price">$${item.precio}</span>
                                    <button class="btn-order" onclick="agregarAlCarrito(${item.id})">
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
        contenedor.innerHTML += seccionHTML;
    });
}

// ... EL RESTO DE FUNCIONES (abrirDetalle, filtrar, enviarOpinion) SE QUEDAN IGUAL ...
// (Copia y pega el resto de tu script.js anterior aquí abajo, ya que la lógica no cambia)
// Solo asegúrate de copiar desde "async function abrirDetalle(id)..." hasta el final.

// AQUI ABAJO PEGA TUS FUNCIONES: abrirDetalle, setText, cerrarDetalle, filtrar, irAlInicio, listeners, etc.
// Son idénticas a las de Casona.

async function abrirDetalle(id) {
    const idNum = Number(id);
    productoActual = todosLosProductos.find(p => p.id === idNum);
    if (!productoActual) return;

    setText('det-titulo', productoActual.nombre);
    setText('det-desc', productoActual.descripcion);
    setText('det-price', `$${productoActual.precio}`);
    const imgEl = document.getElementById('det-img');
    if(imgEl) imgEl.src = productoActual.imagen_url || '';

    try {
        const { data: notas, error } = await supabaseClient
            .from('opiniones')
            .select('puntuacion')
            .eq('producto_id', idNum);

        if (error) throw error;
        let promedioTotal = "0.0";
        let cantidadTotal = 0;
        if (notas && notas.length > 0) {
            const suma = notas.reduce((acc, curr) => acc + curr.puntuacion, 0);
            promedioTotal = (suma / notas.length).toFixed(1);
            cantidadTotal = notas.length;
        }
        
        const notaValor = document.getElementById('det-puntuacion-valor');
        const cantidadTexto = document.getElementById('det-cantidad-opiniones');
        if (notaValor) notaValor.textContent = promedioTotal;
        if (cantidadTexto) cantidadTexto.textContent = `(${cantidadTotal} reseñas)`;

    } catch (err) { console.error(err); }

    const modal = document.getElementById('modal-detalle');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}

function cerrarDetalle() {
    const modal = document.getElementById('modal-detalle');
    if(modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 350);
    }
}

function filtrar(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if (cat === 'todos') {
        renderizarMenu(todosLosProductos); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    const buscador = document.getElementById('search-input');
    if (buscador && buscador.value !== "") {
        buscador.value = ""; 
        renderizarMenu(todosLosProductos); 
    }
    const seccionDestino = document.getElementById(`section-${cat}`);
    if (seccionDestino) {
        const posicion = seccionDestino.offsetTop - 120; 
        window.scrollTo({ top: posicion, behavior: 'smooth' });
    }
}

function irAlInicio(btn) {
    window.scrollTo({ top: 0, behavior: 'smooth'});
    const inputBusqueda = document.getElementById('search-input');
    if (inputBusqueda) inputBusqueda.value = "";
    filtrar('todos', btn);
}

document.addEventListener('input', (e) => {
    if (e.target.id === 'search-input') {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const busqueda = e.target.value.toLowerCase().trim();
            if (busqueda === "") {
                renderizarMenu(todosLosProductos);
            } else {
                const filtrados = todosLosProductos.filter(p => 
                    p.nombre.toLowerCase().includes(busqueda) || 
                    (p.descripcion && p.descripcion.toLowerCase().includes(busqueda))
                );
                renderizarMenu(filtrados);
            }
        }, 300); 
    }
});

const opcionesScroll = { rootMargin: '-150px 0px -70% 0px', threshold: 0 };
const observadorScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const categoriaActiva = entry.target.getAttribute('data-categoria');
            actualizarBotonActivo(categoriaActiva);
        }
    });
}, opcionesScroll);

function actualizarBotonActivo(cat) {
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${cat}'`)) {
            btn.classList.add('active'); 
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    });
}

function activarVigilanciaCategorias() {
    const secciones = document.querySelectorAll('.category-section');
    secciones.forEach(sec => observadorScroll.observe(sec));
}

function abrirOpinionDesdeDetalle() {
    cerrarDetalle(); 
    const modalOp = document.getElementById('modal-opinion');
    if (modalOp) {
        modalOp.style.display = 'flex';
        setTimeout(() => modalOp.classList.add('active'), 10);
        resetearFormularioOpinion();
    }
}

function cerrarModalOpiniones() {
    const modalOp = document.getElementById('modal-opinion');
    if (modalOp) {
        modalOp.classList.remove('active');
        setTimeout(() => modalOp.style.display = 'none', 350);
    }
}

function resetearFormularioOpinion() {
    puntuacionSeleccionada = 0; 
    const estrellas = document.querySelectorAll('#stars-container span');
    estrellas.forEach(s => s.style.color = '#444');
    document.getElementById('cliente-nombre').value = '';
    document.getElementById('cliente-comentario').value = '';
}

document.addEventListener('click', (e) => {
    const estrella = e.target.closest('#stars-container span');
    if (estrella) {
        puntuacionSeleccionada = parseInt(estrella.getAttribute('data-val'));
        const todasLasEstrellas = document.querySelectorAll('#stars-container span');
        todasLasEstrellas.forEach((s, i) => {
            s.style.color = (i < puntuacionSeleccionada) ? '#F50057' : '#444'; // Rosa para las estrellas
        });
    }
});

document.addEventListener('DOMContentLoaded', cargarMenu);

async function enviarOpinion() {
    if (!puntuacionSeleccionada || puntuacionSeleccionada === 0) {
        alert("⚠️ Por favor, selecciona una puntuación.");
        return;
    }
    const elNombre = document.getElementById('cliente-nombre'); 
    const elComentario = document.getElementById('cliente-comentario');
    const btn = document.getElementById('btn-enviar-opinion');
    
    btn.disabled = true;
    btn.textContent = "ENVIANDO...";

    try {
        const { error } = await supabaseClient
            .from('opiniones')
            .insert([{
                producto_id: productoActual.id, 
                cliente_nombre: elNombre.value.trim() || "Anónimo", 
                comentario: elComentario.value.trim(),      
                puntuacion: puntuacionSeleccionada,
                restaurant_id: CONFIG.RESTAURANT_ID
            }]);

        if (error) throw error;
        alert("✅ ¡Gracias! Tu opinión ha sido enviada.");
        cerrarModalOpiniones();
    } catch (err) {
        alert("❌ Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "ENVIAR";
    }
}

async function abrirListaOpiniones() {
    const contenedor = document.getElementById('contenedor-opiniones-full');
    const modalLista = document.getElementById('modal-lista-opiniones');
    if (!productoActual) return;
    modalLista.style.display = 'flex';
    setTimeout(() => modalLista.classList.add('active'), 10);
    contenedor.innerHTML = '<p style="text-align:center; padding:20px; color:#aaa;">Cargando...</p>';

    try {
        const { data: opiniones, error } = await supabaseClient
            .from('opiniones')
            .select('*')
            .eq('producto_id', productoActual.id)
            .order('id', { ascending: false });

        if (error) throw error;

        if (!opiniones || opiniones.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Sin reseñas aún.</p>';
            return;
        }

        contenedor.innerHTML = opiniones.map(op => `
            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px; margin-bottom: 12px; border-left: 3px solid var(--real-pink);">
                <div style="display:flex; justify-content:space-between; align-items: center;">
                    <strong style="color:white; font-size:0.9rem;">${op.cliente_nombre || 'Anónimo'}</strong>
                    <span style="color:#FFD700; font-size:0.8rem;">${'★'.repeat(op.puntuacion)}</span>
                </div>
                <p style="color:#bbb; font-size:0.85rem; margin-top:8px; line-height:1.4;">
                    "${op.comentario || 'Sin comentario.'}"
                </p>
            </div>
        `).join('');

    } catch (err) {
        contenedor.innerHTML = '<p style="color:red; text-align:center;">Error al conectar.</p>';
    }
}

function cerrarListaOpiniones() {
    const modalLista = document.getElementById('modal-lista-opiniones');
    if(modalLista) {
        modalLista.classList.remove('active');
        setTimeout(() => modalLista.style.display = 'none', 300);
    }
}
// ==========================================
// 🛒 LÓGICA DE CARRITO (NUEVO)
// ==========================================

let carrito = [];
// Variable global que guardará el número (empieza vacía o con uno de respaldo)
let telefonoRestaurant = "5350000000"; 

// Función para descargar la configuración al iniciar
async function cargarConfiguracion() {
    // Pedimos a Supabase el valor donde la clave sea 'telefono_pedidos'
    const { data, error } = await supabaseClient
        .from('configuracion')
        .select('valor')
        .eq('clave', 'telefono_pedidos')
        .single();

    if (data) {
        telefonoRestaurant = data.valor; // ¡Actualizamos la variable con el dato real!
        console.log("Número cargado desde base de datos:", telefonoRestaurant);
    } else {
        console.error("Error cargando teléfono:", error);
    }
}

// Llamamos a esta función apenas cargue la página
cargarConfiguracion();
let metodoEntrega = 'domicilio'; 

// 1. AGREGAR AL CARRITO
function agregarAlCarrito(producto) {
    const itemExistente = carrito.find(p => p.id === producto.id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }
    actualizarBotonFlotante();
    // Pequeña vibración para confirmar
    if (navigator.vibrate) navigator.vibrate(50);
}

// 2. ACTUALIZAR EL BOTÓN FLOTANTE
function actualizarBotonFlotante() {
    const btn = document.getElementById('btn-carrito-flotante');
    const contador = document.getElementById('carrito-contador');
    const labelTotal = document.getElementById('carrito-total');
    
    if (carrito.length === 0) {
        btn.style.display = 'none';
        return;
    }
    btn.style.display = 'flex';
    
    const totalItems = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const totalPrecio = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    
    contador.innerText = totalItems;
    labelTotal.innerText = `$${totalPrecio}`;
}

// 3. ABRIR LA LISTA (MODAL)
function abrirModalCarrito() {
    if (carrito.length === 0) return;

    let listaHTML = `<div style="max-height: 250px; overflow-y: auto; background: #1a1a1a; padding: 10px; border-radius: 10px; margin-bottom:15px;">`;
    
    carrito.forEach((item, index) => {
        listaHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding:8px 0;">
                <div style="color:white; flex:1;">
                    <span style="color:#ff007f; font-weight:bold;">${item.cantidad}x</span> ${item.nombre}
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:#bbb;">$${item.precio * item.cantidad}</span>
                    <span class="material-icons" onclick="borrarDelCarrito(${index})" style="color:#666; font-size:1.2rem; cursor:pointer;">delete</span>
                </div>
            </div>`;
    });
    listaHTML += `</div>`;

    document.getElementById('nombre-plato-pedido').innerHTML = listaHTML;
    
    // Ocultar selector de cantidad viejo
    const inputCant = document.getElementById('input-cantidad');
    if(inputCant && inputCant.parentElement) inputCant.parentElement.style.display = 'none';

    // Total final
    const totalPrecio = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    document.getElementById('texto-total').innerText = `$${totalPrecio}`;

    document.getElementById('modal-pedido-overlay').classList.add('active');
}

// 4. BORRAR ITEM
function borrarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarBotonFlotante();
    if (carrito.length === 0) cerrarModalPedido();
    else abrirModalCarrito();
}

// 5. CERRAR
function cerrarModalPedido() {
    document.getElementById('modal-pedido-overlay').classList.remove('active');
}

// 6. CAMBIAR MÉTODO (DOMICILIO/RECOGER)
function setMetodo(metodo) {
    metodoEntrega = metodo;
    const btnDom = document.getElementById('btn-domicilio');
    const btnRec = document.getElementById('btn-recoger');
    const campoDir = document.getElementById('campo-direccion');

    if (metodo === 'domicilio') {
        btnDom.classList.add('active');
        btnRec.classList.remove('active');
        campoDir.style.display = 'block';
    } else {
        btnRec.classList.add('active');
        btnDom.classList.remove('active');
        campoDir.style.display = 'none';
    }
}

// 7. ENVIAR A WHATSAPP
function enviarPedidoWhatsApp() {
    const direccion = document.getElementById('input-direccion').value;
    const totalPrecio = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    
    let mensaje = ` Hola *El Real*, pedido nuevo:\n\n`;
    carrito.forEach(item => {
        mensaje += ` ${item.cantidad}x *${item.nombre}* ($${item.precio * item.cantidad})\n`;
    });
    mensaje += `\n *TOTAL: $${totalPrecio}*\n----------------\n`;

    if (metodoEntrega === 'domicilio') {
        if (!direccion || direccion.trim() === "") {
            alert("⚠️ Escribe tu dirección.");
            return;
        }
        mensaje += ` *A DOMICILIO*\n ${direccion}\n Quedo a espera del costo de envío.`;
    } else {
        mensaje += ` *RECOGER EN LOCAL*`;
    }

   const url = `https://wa.me/${telefonoRestaurant}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    cerrarModalPedido();
}
// ==========================================
// 🔄 LÓGICA MODO BAR (COMPLETA)
// ==========================================

function alternarModoBar() {
    const check = document.getElementById('toggle-bar');
    const esModoBar = check ? check.checked : false;

    // 1. CAMBIAR COLORES (CSS)
    if (esModoBar) {
        document.body.classList.add('modo-bar-activado');
    } else {
        document.body.classList.remove('modo-bar-activado');
    }

    // 2. REORDENAR PRODUCTOS (Volvemos a renderizar)
    if (typeof todosLosProductos !== 'undefined') {
        renderizarMenu(todosLosProductos);
    }

    // 3. REORDENAR BOTONES DE ARRIBA
    reordenarBotonesFiltro(esModoBar);
}

function reordenarBotonesFiltro(modoBar) {
    const nav = document.querySelector('nav'); // O el ID de tu contenedor de botones
    if (!nav) return;

    const botones = Array.from(nav.children);
    const vipsBar = ['cervezas', 'cocteles', 'vinos', 'tragos', 'cremas', 'picaderas', 'bebidas'];

    botones.sort((a, b) => {
        if (a.innerText.includes('Inicio')) return -1;
        if (b.innerText.includes('Inicio')) return 1;

        const onclickA = (a.getAttribute('onclick') || '').toLowerCase();
        const onclickB = (b.getAttribute('onclick') || '').toLowerCase();
        const esVipA = vipsBar.some(palabra => onclickA.includes(palabra));
        const esVipB = vipsBar.some(palabra => onclickB.includes(palabra));

        if (modoBar) {
            if (esVipA && !esVipB) return -1;
            if (!esVipA && esVipB) return 1;
            return 0;
        } else {
            if (esVipA && !esVipB) return 1;
            if (!esVipA && esVipB) return -1;
            return 0;
        }
    });

    botones.forEach(btn => nav.appendChild(btn));
}





