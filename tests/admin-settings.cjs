const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('https://**/*',route=>route.fulfill({body:'',contentType:'text/javascript'}));
await page.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:`
const CONFIG={RESTAURANT_ID:1};const rows={};const products=[{id:1,nombre:'Plato',categoria:'entrantes',precio:10,activo:true,estado:'disponible',opiniones:[]}];window.testRows=rows;window.testProducts=products;
const supabaseClient={auth:{getSession:async()=>({data:{session:{}}})},storage:{from:()=>({upload:async(path,file)=>{const bitmap=await createImageBitmap(file);window.uploadInfo={size:file.size,type:file.type,width:bitmap.width,height:bitmap.height};bitmap.close();return {}},getPublicUrl:()=>({data:{publicUrl:'http://127.0.0.1:8000/logo-real.png'}}),remove:async()=>({})})},from(table){let op='read',payload,filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},insert(p){op='insert';payload=p;return q},update(p){op='update';payload=p;return q},maybeSingle(){return Promise.resolve({data:rows[filters.find(f=>f[0]==='clave')?.[1]]||null})},single(){return Promise.resolve({data:{valor:'5350000000'}})},then(resolve){let data;if(table==='productos'){if(op==='insert' && window.failProduct)return Promise.resolve({error:{message:'Fallo de producto simulado'}}).then(resolve);if(op==='insert')products.push(...payload.map(p=>({...p,id:products.length+1,opiniones:[]})));data=products;}else if(op==='read')data=[];else{const key=payload.clave||filters.find(f=>f[0]==='clave')[1];rows[key]={clave:key,...payload};data=[rows[key]]}return Promise.resolve({data}).then(resolve)}};return q}};` }));
await page.goto('http://127.0.0.1:8000/admin.html');await page.waitForFunction(()=>!document.querySelector('#renombrar-categoria').disabled);
async function nuevoProducto(nombre, categoria) {
 await page.locator('#nombre').fill(nombre);
 await page.locator('#precio').fill('20');
 await page.locator('#categoria').selectOption('__nueva__');
 await page.locator('#nueva-categoria').fill(categoria);
 await page.locator('#btn-submit').click();
}
await page.evaluate(()=>window.failProduct=true);
await nuevoProducto('No guardar','Categoría fallida');
await page.waitForFunction(()=>!document.querySelector('#btn-submit').disabled);
assert.equal(await page.evaluate(()=>!!testRows.menu_1_categorias),false);
await page.evaluate(()=>{window.failProduct=false;cancelarEdicion()});
await nuevoProducto('Especial del día','Especialidades');
await page.waitForFunction(()=>document.querySelector('#categoria').selectedOptions[0]?.value !== '__nueva__');
let nuevaId = await page.evaluate(()=>JSON.parse(testRows.menu_1_categorias.valor).find(c=>c.nombre==='Especialidades').id);
assert(await page.locator(`#categoria option[value="${nuevaId}"]`).count());
assert(await page.locator('.inventory-category').filter({hasText:'Especialidades'}).count());
await page.locator('#categoria-renombrar').selectOption(nuevaId);
await page.locator('#nombre-categoria').fill('Especiales de la casa');
await page.locator('#renombrar-categoria').click();
await page.waitForFunction(()=>document.querySelector('#estado-categorias').textContent==='Categorías guardadas.');
assert.equal(await page.locator(`#categoria option[value="${nuevaId}"]`).textContent(),'Especiales de la casa');
assert(await page.locator('.inventory-category').filter({hasText:'Especiales de la casa'}).count());
await page.locator('#nombre-categoria').fill(' ENTRANTES ');
await page.locator('#renombrar-categoria').click();
await page.waitForFunction(()=>document.querySelector('#estado-categorias').textContent.includes('Ya existe'));
await page.getByRole('button',{name:'Eliminar categoría Especiales de la casa',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('#estado-categorias').textContent.includes('productos activos'));
await page.getByRole('button',{name:'Eliminar categoría Cafés',exact:true}).click();
await page.waitForFunction(()=>!document.querySelector('#categoria option[value="cafes"]'));
await nuevoProducto('Duplicado','especiales de la casa');
assert.equal(await page.locator('#categoria').inputValue(),'__nueva__');
assert.equal(await page.locator('.seleccion-producto').count(),2);
await page.evaluate(()=>cancelarEdicion());
const coverChecks = await page.evaluate(async () => {
 const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1200;
 const ctx=canvas.getContext('2d');const pixels=ctx.createImageData(canvas.width,canvas.height);
 let seed=12345;for(let i=0;i<pixels.data.length;i+=4){for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels.data[i+c]=seed>>>24}pixels.data[i+3]=255}
 ctx.putImageData(pixels,0,0);
 const source=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 const optimized=await optimizarPortada(new File([source],'noise.png',{type:'image/png'}));
 const bitmap=await createImageBitmap(optimized);const result={size:optimized.size,width:bitmap.width,height:bitmap.height};bitmap.close();
 canvas.width=40;canvas.height=20;
 const small=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 const smallBitmap=await createImageBitmap(await optimizarPortada(new File([small],'small.png',{type:'image/png'})));
 result.small=[smallBitmap.width,smallBitmap.height];smallBitmap.close();
 try {await optimizarPortada(new File(['not an image'],'bad.png',{type:'image/png'}));result.rejectsInvalid=false} catch {result.rejectsInvalid=true}
 return result;
});
assert(coverChecks.size<=150*1024);assert(coverChecks.width<1080);assert.deepEqual(coverChecks.small,[40,20]);assert(coverChecks.rejectsInvalid);console.log('Cover stress checks:',coverChecks);
await page.locator('#portada-file').setInputFiles(require('node:path').join(__dirname, '..', 'fondo-real.jpg'));await page.locator('#guardar-portada').click();await page.waitForFunction(()=>document.querySelector('#estado-portada').textContent.includes('Portada actualizada'));
const uploadInfo=await page.evaluate(()=>window.uploadInfo);assert(uploadInfo.size<=150*1024);assert.equal(uploadInfo.type,'image/webp');assert(uploadInfo.width<=1280 && uploadInfo.height<=720);console.log('Cover upload:',uploadInfo);assert(await page.evaluate(()=>testRows.menu_1_portada.valor.includes('logo-real.png')));assert(await page.locator('.seleccion-producto').count()===2);await page.locator('#seleccionar-visibles').check();assert(await page.locator('.seleccion-producto').first().isChecked());assert(await page.locator('#eliminar-seleccionados').isEnabled());
// Pixel 6a sized viewports, smaller phones, desktop, and larger text.
for (const [width,height] of [[393,851],[412,915],[320,700],[1280,900]]) {
 await page.setViewportSize({width,height});
 const layout=await page.evaluate(()=>{
  const exit=document.querySelector('.admin-logout').getBoundingClientRect();
  const inventory=document.querySelector('.inventory-zone').getBoundingClientRect();
  return {right:exit.right,left:exit.left,height:exit.height,scroll:document.documentElement.scrollWidth,viewport:innerWidth,inventoryWidth:inventory.width,fontSize:parseFloat(getComputedStyle(document.querySelector('.item-title')).fontSize)};
 });
 if(width>=393) assert(layout.scroll<=width,`Horizontal overflow at ${width}`);assert(layout.left>=0 && layout.right<=width);assert(layout.height>=44);assert(layout.fontSize>=14);
 if(width<=600) assert(Math.abs(width-layout.right-12)<=1,'Logout must align with mobile header padding');
}
await page.setViewportSize({width:393,height:851});
await page.evaluate(()=>document.documentElement.style.fontSize='20px');
assert(await page.evaluate(()=>{const exit=document.querySelector('.admin-logout').getBoundingClientRect();return exit.left>=0 && exit.right<=innerWidth}));
await page.evaluate(()=>document.documentElement.style.fontSize='');
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/admin-mobile.png',fullPage:true});
const savedProducts=await page.evaluate(()=>testProducts);await page.addInitScript(products=>{window.savedProducts=products},savedProducts);
const saved=await page.evaluate(()=>testRows);await page.addInitScript(rows=>{window.savedRows=rows},saved);
// Seed persisted settings before public scripts execute.
await page.route('**/menu-settings.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nObject.assign(testRows, window.savedRows || {});if(window.savedProducts)testProducts.splice(0,testProducts.length,...window.savedProducts);'});});
await page.goto('http://127.0.0.1:8000/');await page.locator('.card-real').first().waitFor();assert((await page.locator('.hero-bg-cover').getAttribute('src')).includes('logo-real.png'));assert(await page.locator('.filters button[data-categoria="entrantes"]').count());assert(await page.locator('.filters button').filter({hasText:'Especiales de la casa'}).count());assert.equal(await page.locator('#toggle-bar').count(),0);assert(await page.locator('.category-section').filter({hasText:'Especiales de la casa'}).filter({hasText:'Especial del día'}).count());// Missing images, valid photos, and failed photos use the same fallback in cards and details.
assert(await page.locator('.card-real img').first().evaluate(img=>img.getAttribute('src')==='img/logo.png'));
await page.evaluate(()=>abrirDetalle(1));
await page.waitForFunction(()=>document.querySelector('#det-img').complete && document.querySelector('#det-img').naturalWidth>0);
assert.equal(await page.locator('#det-img').getAttribute('src'),'img/logo.png');
await page.evaluate(()=>{cerrarDetalle();testProducts[0].imagen_url='logo-real.png';return cargarMenu()});
await page.waitForFunction(()=>document.querySelector('.card-real img').getAttribute('src')==='logo-real.png');
await page.evaluate(()=>abrirDetalle(1));
assert.equal(await page.locator('#det-img').getAttribute('src'),'logo-real.png');
await page.evaluate(()=>{cerrarDetalle();testProducts[0].imagen_url='missing-photo.jpg';return cargarMenu()});
await page.waitForFunction(()=>document.querySelector('.card-real img').getAttribute('src')==='img/logo.png');
await page.evaluate(()=>abrirDetalle(1));
await page.waitForFunction(()=>{const img=document.querySelector('#det-img');return img.getAttribute('src')==='img/logo.png' && img.complete && img.naturalWidth>0});
assert.deepEqual(errors,[]);console.log('PASS: inline creation with product, stable-ID rename, duplicate protection, occupied deletion guard, empty deletion, cover upload/persistence/public display, product selection, mobile width, menu rendering, missing/valid/broken product photos in cards and details; no JS errors.');await browser.close();})().catch(e=>{console.error(e);process.exitCode=1});
