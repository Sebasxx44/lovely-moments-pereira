# Lovely Moments · Pereira

Rediseño independiente de la tienda de flores y chocolates Lovely Moments. La portada presenta cuatro regalos en una vitrina que responde al scroll. El catálogo reúne 317 fichas, 39 colecciones y 561 fotos de galería, junto con el blog, cursos e información de la tienda.

## Ejecutar

Con Node.js 22 o superior, ejecuta `node scripts/build.mjs`. Sirve la carpeta `dist` desde la raíz de un servidor estático. La compilación utiliza las bibliotecas de Node y los archivos del repositorio.

## Estructura

- `site/` contiene la portada, tipografías, estilos, imágenes y movimiento de los productos.
- `scripts/data/` contiene las fichas, colecciones y páginas del catálogo.
- `scripts/` genera los HTML interiores y el índice del buscador.
- `vercel.json` configura la compilación y el directorio de publicación.

La selección de regalos se guarda en el navegador. Los formularios preparan una consulta que el visitante revisa en WhatsApp. Para los productos que admiten compra, el pago continúa en la tienda oficial. Los datos del catálogo corresponden al 18 de noviembre de 2026.

## Créditos

Concepto y desarrollo de Sebaz. Las fotografías y el contenido de producto provienen de [Lovely Moments](https://lovelymoments.com.co/). La dirección de movimiento toma como referencia [Protein Bars de MotionSites](https://motionsites.ai/?prompt=protein-bars). La revisión visual incorpora [Unslop de Damir Sokolovsky](https://github.com/heydamir/unslop), con licencia CC BY 4.0.
