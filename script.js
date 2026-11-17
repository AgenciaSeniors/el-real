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

        productos.forEach(p => { p.categoria = MenuSettings.normalize(p.categoria); });
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
// 2. RENDERIZAR LA CARTA
function renderizarMenu(lista) {
    const contenedor = document.getElementById('menu-grid');
    if (!contenedor) return;

    contenedor.style.display = 'block';
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        actualizarFiltrosMenu(Object.fromEntries((categoriasPublicas ?? MenuSettings.defaults).map(c => [c.id, {nombre:MenuSettings.escape(c.nombre), icono:'🍽️'}])));
        contenedor.innerHTML = `
            <div style="text-align:center; grid-column:1/-1; padding:40px; color:#888;">
                <span class="material-icons" style="font-size:3rem; display:block; margin-bottom:10px;">no_meals</span>
                No se encontraron productos.
            </div>`;
        return;
    }

    // Definimos las categorías y sus metadatos
    const categorias = Object.assign(Object.create(null), {
        'entrantes': { nombre: 'Entrantes', icono: '🍟' },
          'cerdo': { nombre: 'Cerdo', icono: '🥩' },
        'res': { nombre: 'Res', icono: '🍖' },
        'pollo': { nombre: 'Pollo', icono: '🍗' },
        'pescados': { nombre: 'Pescados', icono: '🐟' },
        'mariscos': { nombre: 'Mariscos', icono: '🦐' },
         'sugerencias del chef': { nombre: 'Sugerencias del Chef', icono: '👑' },
         'completas': { 
    nombre: 'Completas <br><span style="font-size: 0.55em; display: block; font-family: sans-serif; font-weight: normal; opacity: 0.8; margin-top: 5px;">(Incluyen arroz, vianda hervida y ensalada)</span>', 
    icono: '🍽️' 
        },
        'guarniciones': { nombre: 'Guarniciones', icono: '🥗' },
         'pizzas': { nombre: 'Pizzas', icono: '🍕' },
        'spaghettis': { nombre: 'Spaghettis', icono: '🍝' },
         'agregados': { nombre: 'Agregados', icono: '🧀' },
        'lasaña': { nombre: 'Lasaña', icono: '🥘' },
        'postres': { nombre: 'Postres', icono: '🍨' },
        'cafes': { nombre: 'Cafés', icono: '☕' },
        'bebidas s/a': { nombre: 'Bebidas S/A', icono: '🥤' },
        'cervezas': { nombre: 'Cervezas', icono: '🍺' },
        'cocteles': { nombre: 'Cocteles', icono: '🍹' },
        'vinos': { nombre: 'Vinos', icono: '🍷' },
        'tragos': { nombre: 'Tragos', icono: '🥃' },
        'cremas': { nombre: 'Cremas', icono: '🍸' },
        'picaderas': { nombre: 'Picaderas', icono: '🍢' }
       
    });

    const disponibles = categoriasPublicas ?? MenuSettings.defaults;
    const metadatos = {...categorias};
    Object.keys(categorias).forEach(key => delete categorias[key]);
    disponibles.forEach(c => {
        categorias[c.id] = {nombre: MenuSettings.escape(c.nombre), icono: metadatos[c.id]?.icono || '🍽️'};
    });
    // Keep legacy or concurrently added products visible, even with stale settings.
    lista.forEach(p => {
        if (!Object.hasOwn(categorias, p.categoria)) categorias[p.categoria] = {nombre: MenuSettings.escape(p.categoria), icono:'🍽️'};
    });

    const ordenCategorias = Object.keys(categorias);

    ordenCategorias.forEach(catKey => {
        const productosCategoria = lista.filter(p => p.categoria === catKey);
        
        if (productosCategoria.length > 0) {
            const catInfo = categorias[catKey];
            const seccionHTML = `
                <div class="category-section" id="section-${MenuSettings.escape(catKey)}" data-categoria="${MenuSettings.escape(catKey)}">
                    <h2 class="category-title-real">${catInfo.icono} ${catInfo.nombre}</h2>
                    <div class="horizontal-scroll">
                      ${productosCategoria.map(item => {
                        const esAgotado = item.estado === 'agotado';
                        const claseAgotado = esAgotado ? 'is-agotado' : '';
                        const badgeAgotado = esAgotado ? '<div class="badge-agotado-real">AGOTADO</div>' : '';

                        return `
                            <div class="card-real ${claseAgotado}" onclick="${esAgotado ? '' : `abrirDetalle(${item.id})`}">
                                <div class="card-img-container">
                                    ${badgeAgotado}
                                    <img src="${MenuSettings.escape(item.imagen_url?.trim() || 'img/logo.png')}" loading="lazy" alt="${MenuSettings.escape(item.nombre)}" onerror="this.onerror=null;this.src='img/logo.png'">
                                    ${item.destacado ? '<span class="tag-destacado">TOP</span>' : ''}
                                </div>
                                <div class="card-body">
                                    <h3>${item.nombre}</h3>
                                    <div class="card-footer">
                                        <span class="card-price">$${item.precio}</span>
                                        <button class="btn-bag-action" onclick='event.stopPropagation(); agregarAlCarrito(${JSON.stringify(item)})'>
                                            <span class="material-icons">shopping_bag</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    </div>
                </div>
            `;
            contenedor.innerHTML += seccionHTML;
        }
    });

    actualizarFiltrosMenu(categorias);
    activarVigilanciaCategorias();
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
    if (imgEl) {
        imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = 'img/logo.png'; };
        imgEl.src = productoActual.imagen_url?.trim() || 'img/logo.png';
        imgEl.alt = productoActual.nombre;
    }

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
        if (btn.dataset.categoria === cat) {
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

let categoriasPublicas = null;
function actualizarFiltrosMenu(categorias) {
    const nav = document.querySelector('.filters');
    const activo = nav.querySelector('.active')?.dataset.categoria;
    nav.replaceChildren();
    const inicio = document.createElement('button');
    inicio.className = 'filter-btn' + (!activo ? ' active' : '');
    inicio.textContent = '🏛️ Inicio';
    inicio.onclick = () => irAlInicio(inicio);
    nav.append(inicio);
    Object.entries(categorias).forEach(([id, info]) => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (activo === id ? ' active' : '');
        btn.dataset.categoria = id;
        // Decode the escaped label as text, never as markup in the page.
        const texto = document.createElement('textarea'); texto.innerHTML = info.nombre;
        btn.textContent = `${info.icono} ${texto.value}`;
        btn.onclick = () => filtrar(id, btn);
        nav.append(btn);
    });
}
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        MenuSettings.read('categorias').then(data => { if (Array.isArray(data)) categoriasPublicas = data; }).catch(error => console.error('Categorías:', error.message)),
        MenuSettings.read('portada').then(url => {
            if (!url) return;
            const img = document.querySelector('.hero-bg-cover');
            img.onerror = () => { img.onerror = null; img.src = 'fondo-real.jpg'; };
            img.src = url;
        }).catch(error => console.error('Portada:', error.message))
    ]);
    await cargarMenu();
});

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

function abrirModalCarrito() {
    if (carrito.length === 0) return;

    // Generar la lista de productos
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
    
    // Ocultar selector de cantidad viejo si existe
    const inputCant = document.getElementById('input-cantidad');
    if(inputCant && inputCant.parentElement) inputCant.parentElement.style.display = 'none';

    // Llamamos a la función que calcula el total con envío
    actualizarTextoTotalModal();

    document.getElementById('modal-pedido-overlay').classList.add('active');
}

function borrarDelCarrito(index) {
    // Si hay más de 1 unidad, solo restamos una
    if (carrito[index].cantidad > 1) {
        carrito[index].cantidad--; 
    } else {
        // Si solo queda 1, entonces sí lo borramos del array
        carrito.splice(index, 1); 
    }

   
    actualizarBotonFlotante(); // Actualizamos el globito rojo

    // Si el carrito se quedó vacío, cerramos el modal
    if (carrito.length === 0) {
        cerrarModalPedido();
    } else {
        // Si quedan cosas, recargamos la lista visualmente para ver el cambio
        abrirModalCarrito(); 
    }
}
// 5. CERRAR
function cerrarModalPedido() {
    document.getElementById('modal-pedido-overlay').classList.remove('active');
}

// 6. CAMBIAR MÉTODO (DOMICILIO/RECOGER)
// 6. CAMBIAR MÉTODO (DOMICILIO/RECOGER)
function setMetodo(metodo) {
    metodoEntrega = metodo; // Actualiza la variable global
    
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

    // NUEVO: ¡Recalcular el precio total inmediatamente!
    actualizarTextoTotalModal();
}

// 7. ENVIAR A WHATSAPP
function enviarPedidoWhatsApp() {
    const direccion = document.getElementById('input-direccion').value;
   // --- MODIFICACIÓN: Calcular total con envío ---
    let totalPrecio = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    
    // Si es domicilio, le sumamos los 200 a la variable antes de crear el mensaje
    if (metodoEntrega === 'domicilio') {
        totalPrecio += 200; 
    }
    // ----------------------------------------------
    
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
        mensaje += ` *A DOMICILIO*\n ${direccion}`;
    } else {
        mensaje += ` *RECOGER EN LOCAL*`;
    }

  const url = `https://api.whatsapp.com/send?phone=${telefonoRestaurant}&text=${encodeURIComponent(mensaje)}`;
    console.log("Redirigiendo a:", url);
   window.location.href = url;
    cerrarModalPedido();
}
// FUNCIÓN AUXILIAR: CALCULAR Y MOSTRAR TOTAL CON DOMICILIO
function actualizarTextoTotalModal() {
    // 1. Sumar los productos
    let total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // 2. Definir el texto extra
    let textoInfo = '';

    // 3. Si está en modo domicilio, sumamos 200
    if (metodoEntrega === 'domicilio') {
        total += 200;
        textoInfo = `<span style="font-size: 0.8rem; color: #ff007f; display:block; margin-top:4px;">(Incluye $200 de envío)</span>`;
    } else {
        textoInfo = `<span style="font-size: 0.8rem; color: #888; display:block; margin-top:4px;">(Recogida en local)</span>`;
    }

    // 4. Escribir en el HTML
    const labelTotal = document.getElementById('texto-total');
    if (labelTotal) {
        labelTotal.innerHTML = `$${total} ${textoInfo}`;
    }
}












