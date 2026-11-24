import ExcelJS from 'exceljs';
import { fail, integer, transaction } from './phase3Service.js';
export const importColumns=['titulo','descripcion','precio','categoria','sede','turno','stock_disponible','es_mas_vendido','imagen_url'];
export async function makeWorkbook(headers,rows,name='Carta'){
 const workbook=new ExcelJS.Workbook();workbook.creator='Punto 29';
 const sheet=workbook.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});
 sheet.columns=headers.map((h,i)=>({header:h,key:h,width:/descripcion|direccion/i.test(h)?48:/cliente|titulo|imagen/i.test(h)?32:i===0?26:22}));
 rows.forEach(row=>sheet.addRow(row));
 sheet.getRow(1).height=30;sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF333333'}};
 sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:headers.length}};
 sheet.eachRow((row,index)=>{if(index>1){row.height=32;row.alignment={vertical:'middle',wrapText:true};if(index%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF4EEE1'}};}});
 if(headers.includes('precio'))sheet.getColumn('precio').numFmt='"S/ "#,##0.00';
 if(name==='Plantilla')for(let r=2;r<=501;r++){
  sheet.getCell(`F${r}`).dataValidation={type:'list',allowBlank:false,formulae:['"dia,noche,bar,todos"']};
  sheet.getCell(`H${r}`).dataValidation={type:'list',allowBlank:false,formulae:['"SI,NO"']};
 }
 return workbook.xlsx.writeBuffer();
}
export async function parseWorkbook(buffer){
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer);
 const sheet=workbook.worksheets[0];if(!sheet)fail(400,'El archivo no contiene una hoja.');
 const headers=sheet.getRow(1).values.slice(1).map(v=>String(v||'').trim());
 if(importColumns.some((h,i)=>headers[i]!==h))fail(400,'Usa las columnas de la plantilla en el mismo orden.');
 if(sheet.actualRowCount>501)fail(400,'Importa hasta 500 productos por archivo.');
 const rows=[];
 sheet.eachRow((row,n)=>{
  if(n===1)return;
  const values=importColumns.map((_,i)=>row.getCell(i+1).value);
  if(values.every(v=>v===null||v===''))return;
  if(values.some(v=>v!==null&&typeof v==='object'))fail(400,`Fila ${n}: usa valores, sin fórmulas ni enlaces de Excel.`);
  const item=Object.fromEntries(importColumns.map((h,i)=>[h,values[i]??'']));
  if(!String(item.titulo).trim()||!String(item.categoria).trim()||item.precio===''||!Number.isFinite(Number(item.precio))||Number(item.precio)<0||!integer(item.stock_disponible,0)||!['dia','noche','bar','todos'].includes(item.turno)||!['SI','NO'].includes(String(item.es_mas_vendido).toUpperCase()))fail(400,`Fila ${n}: revisa título, categoría, precio, turno, stock y SI/NO.`);
  if(item.imagen_url&&!/^https?:\/\//i.test(String(item.imagen_url)))fail(400,`Fila ${n}: imagen_url debe ser un enlace http o https.`);
  rows.push({...item,line:n});
 });
 if(!rows.length)fail(400,'Agrega al menos un producto a la plantilla.');return rows;
}
export async function importProducts(pool,rows){return transaction(pool,async db=>{
 await db.query('SELECT pg_advisory_xact_lock(290004)');
 const sedes=(await db.query('SELECT id,nombre FROM sedes')).rows;
 for(const row of rows){
  const sede=sedes.find(s=>String(s.id)===String(row.sede).trim()||s.nombre.toLowerCase()===String(row.sede).trim().toLowerCase());
  if(!sede)fail(400,`Fila ${row.line}: sede desconocida.`);
  const old=(await db.query('SELECT id FROM carta_productos WHERE sede_id=$1 AND turno=$2 AND lower(titulo)=lower($3) ORDER BY id FOR UPDATE',[sede.id,row.turno,row.titulo.trim()])).rows;
  if(old.length>1)fail(409,`Fila ${row.line}: hay títulos duplicados; edítalos por ID antes de importar.`);
  const values=[row.titulo.trim(),row.descripcion,Number(row.precio),row.categoria,sede.id,row.turno,Number(row.stock_disponible),String(row.es_mas_vendido).toUpperCase()==='SI',row.imagen_url];
  if(old.length)await db.query('UPDATE carta_productos SET titulo=$1,descripcion=$2,precio=$3,categoria=$4,sede_id=$5,turno=$6,stock_disponible=$7,es_mas_vendido=$8,imagen_url=$9 WHERE id=$10',[...values,old[0].id]);
  else await db.query('INSERT INTO carta_productos(titulo,descripcion,precio,categoria,sede_id,turno,stock_disponible,es_mas_vendido,imagen_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',values);
 }
 return {importados:rows.length};
});}
