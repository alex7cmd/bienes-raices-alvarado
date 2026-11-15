const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function buildInitialData() {
  const prototypes = [
    {
      id: 'areni',
      name: 'Areni',
      price: 1382000,
      bedrooms: 2,
      bathrooms: 1,
      area: 90,
      parking: 2,
      description: 'Diseño funcional y luminoso ideal para parejas o familias jóvenes, con excelente distribución en terreno de 90 m².',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/07/20220221_114215-525x328.jpg',
      video: ''
    },
    {
      id: 'arveto',
      name: 'Arveto',
      price: 1660000,
      bedrooms: 2,
      bathrooms: 1.5,
      area: 90,
      parking: 2,
      description: 'Residencia contemporánea de 2 recámaras y 1.5 baños con espacios integrados y acabados de primera.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Moscatell-525x328.jpg',
      video: ''
    },
    {
      id: 'brachetto',
      name: 'Brachetto',
      price: 1847000,
      bedrooms: 3,
      bathrooms: 1.5,
      area: 78,
      parking: 2,
      description: 'Tres recámaras optimizadas en un proyecto inteligente con iluminación natural y 2 cajones de estacionamiento.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Ruche-525x328.jpg',
      video: ''
    },
    {
      id: 'belat',
      name: 'Belat',
      price: 1865000,
      bedrooms: 2,
      bathrooms: 1.5,
      area: 80,
      parking: 2,
      description: 'Estilo minimalista con sala-comedor amplia, cocina equipada y patio trasero privado.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2026/06/FACHADAS-WEB-3-525x328.png',
      video: ''
    },
    {
      id: 'moscatel',
      name: 'Moscatel',
      price: 1905000,
      bedrooms: 3,
      bathrooms: 1.5,
      area: 105,
      parking: 2,
      description: 'Terreno de 105 m² con 3 recámaras, ideal para crecer en familia dentro de privada con amenidades.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Moscatell-525x328.jpg',
      video: ''
    },
    {
      id: 'carlina',
      name: 'Carlina',
      price: 1970000,
      bedrooms: 3,
      bathrooms: 2.5,
      area: 105,
      parking: 2,
      description: 'Tres recámaras y 2.5 baños con recámara principal amplia, vestidor y excelente orientación.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-525x328.jpg',
      video: ''
    },
    {
      id: 'belora',
      name: 'Belora',
      price: 2320000,
      bedrooms: 3,
      bathrooms: 2,
      area: 113,
      parking: 2,
      description: 'Amplitud en cada nivel sobre 113 m² de terreno, pensada para confort y privacidad familiar.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/07/20220221_114215-525x328.jpg',
      video: ''
    },
    {
      id: 'ruche',
      name: 'Ruche',
      price: 2600000,
      bedrooms: 3,
      bathrooms: 2.5,
      area: 105,
      parking: 2,
      description: 'Arquitectura moderna con doble altura parcial, 3 recámaras y 2.5 baños.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Ruche-525x328.jpg',
      video: ''
    },
    {
      id: 'loureira',
      name: 'Loureira',
      price: 2920000,
      bedrooms: 3,
      bathrooms: 3.5,
      area: 123,
      parking: 2,
      description: 'Cada recámara con baño completo más medio baño de visitas, acabados residenciales premium.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-525x328.jpg',
      video: ''
    },
    {
      id: 'gracciano',
      name: 'Gracciano',
      price: 3345000,
      bedrooms: 3,
      bathrooms: 3.5,
      area: 140,
      parking: 2,
      description: 'Amplia residencia en terreno de 140 m² con jardín interior, roof garden opcional y 3.5 baños.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2026/06/FACHADAS-WEB-3-525x328.png',
      video: ''
    },
    {
      id: 'malvasia',
      name: 'Malvasia',
      price: 4500000,
      bedrooms: 4,
      bathrooms: 5,
      area: 242,
      parking: 2,
      description: 'Nuestra residencia insignia de 4 recámaras, 5 baños y 242 m² de terreno con espacios de lujo.',
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-525x328.jpg',
      video: ''
    }
  ];

  const developments = [
    {
      id: 'sorento',
      name: 'Sorento',
      tagline: 'Privada residencial con casa club y alberca',
      startingPrice: 1660000,
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-525x328.jpg'
    },
    {
      id: 'oporto',
      name: 'Oporto',
      tagline: 'Canchas deportivas y amplias áreas verdes',
      startingPrice: 1382000,
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/07/20220221_114215-525x328.jpg'
    },
    {
      id: 'ardenza',
      name: 'Ardenza',
      tagline: 'Acceso controlado y arquitectura contemporánea',
      startingPrice: 1905000,
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Moscatell-525x328.jpg'
    },
    {
      id: 'montalese',
      name: 'Montalese',
      tagline: 'Diseño familiar con calles tranquilas',
      startingPrice: 1847000,
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Ruche-525x328.jpg'
    },
    {
      id: 'torres-qavalta',
      name: 'Torres Qavalta',
      tagline: 'Departamentos modernos con vista panorámica',
      startingPrice: 1970000,
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2026/06/FACHADAS-WEB-3-525x328.png'
    },
    {
      id: 'vittoria',
      name: 'Vittoria',
      tagline: 'Privada estrella con parque central y glorieta',
      startingPrice: 1550000,
      image: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-525x328.jpg'
    }
  ];

  // Generate traced blocks & lots matching the uploaded Vittoria reference photo
  // Coordinates are in a 1000 x 1100 SVG viewBox
  const lots = [];
  const protoIds = prototypes.map(p => p.id);

  // Deterministic pseudo-random helper so demo looks balanced & realistic
  function seeded(n) {
    const x = Math.sin(n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  function pickStatus(idx) {
    const r = seeded(idx);
    if (r < 0.24) return 'disponible';
    if (r < 0.86) return 'no_disponible';
    return 'vendido';
  }

  function pickProto(idx) {
    const r = seeded(idx + 77);
    return protoIds[Math.floor(r * protoIds.length)];
  }

  let lotSeq = 1;

  // Helper to add a double-row block (top row + bottom row)
  function addBlock(blockId, streetTop, x, y, w, h, cols, startNumTop, startNumBot) {
    const lotW = w / cols;
    const lotH = (h - 22) / 2; // 22px central green/alley strip inside block
    for (let c = 0; c < cols; c++) {
      const numTop = String(startNumTop - c * 2);
      const idTop = `M${blockId}-${numTop}`;
      lots.push({
        id: idTop,
        number: numTop,
        manzana: blockId,
        street: streetTop,
        x: Math.round(x + c * lotW),
        y: Math.round(y),
        w: Math.round(lotW - 2),
        h: Math.round(lotH),
        status: pickStatus(lotSeq),
        prototypeId: pickProto(lotSeq++)
      });

      const numBot = String(startNumBot - c * 2);
      const idBot = `M${blockId}-${numBot}`;
      lots.push({
        id: idBot,
        number: numBot,
        manzana: blockId,
        street: streetTop,
        x: Math.round(x + c * lotW),
        y: Math.round(y + lotH + 22),
        w: Math.round(lotW - 2),
        h: Math.round(lotH),
        status: pickStatus(lotSeq),
        prototypeId: pickProto(lotSeq++)
      });
    }
  }

  // Top strip (Manzana 1)
  for (let c = 0; c < 18; c++) {
    const num = String(162 - c * 2);
    lots.push({
      id: `M1-${num}`,
      number: num,
      manzana: 1,
      street: 'C. Senia Norte',
      x: Math.round(160 + c * 38),
      y: 34,
      w: 36,
      h: 44,
      status: pickStatus(lotSeq),
      prototypeId: pickProto(lotSeq++)
    });
  }

  // Left Column Blocks (Manzanas 19, 18, 17, 16, 14)
  addBlock(19, 'C. Senia', 160, 110, 300, 110, 10, 153, 154);
  addBlock(18, 'C. Colombo', 152, 250, 308, 110, 10, 147, 126);
  addBlock(17, 'C. Leopardi', 144, 390, 290, 110, 9, 123, 120);
  addBlock(16, 'C. Magenta', 136, 530, 290, 110, 9, 121, 124);
  addBlock(14, 'C. Martino', 128, 670, 326, 110, 10, 131, 146);

  // Right Column Blocks (Manzanas 2, 3, 4, 6, 8)
  addBlock(2, 'C. Senia', 530, 110, 300, 110, 10, 129, 128);
  addBlock(3, 'C. Colombo', 536, 250, 294, 110, 10, 119, 120);
  addBlock(4, 'C. Milano', 540, 390, 282, 110, 9, 117, 116);
  addBlock(6, 'C. Panti', 540, 530, 276, 110, 9, 115, 116);
  addBlock(8, 'C. Marmora', 540, 670, 270, 110, 9, 117, 114);

  // Central Park Flanking Lots (Paseo Vittoria)
  for (let r = 0; r < 6; r++) {
    const numTop = String(135 - r * 2);
    lots.push({
      id: `MC-${numTop}`,
      number: numTop,
      manzana: 5,
      street: 'C. Paseo Vittoria',
      x: 492,
      y: 252 + r * 26,
      w: 30,
      h: 24,
      status: pickStatus(lotSeq),
      prototypeId: pickProto(lotSeq++)
    });
  }
  for (let r = 0; r < 6; r++) {
    const numBot = String(117 - r * 2);
    lots.push({
      id: `MC-${numBot}`,
      number: numBot,
      manzana: 5,
      street: 'C. Paseo Vittoria',
      x: 492,
      y: 620 + r * 26,
      w: 30,
      h: 24,
      status: pickStatus(lotSeq),
      prototypeId: pickProto(lotSeq++)
    });
  }

  // Bottom Row Blocks (Manzanas 13, 12, 11, 10, 9)
  for (let r = 0; r < 4; r++) {
    const n1 = String(100 + r * 2);
    lots.push({ id: `M13-${n1}`, number: n1, manzana: 13, street: 'C. Torino', x: 120, y: 816 + r * 30, w: 38, h: 28, status: pickStatus(lotSeq), prototypeId: pickProto(lotSeq++) });
    const n2 = String(101 + r * 2);
    lots.push({ id: `M13-${n2}`, number: n2, manzana: 13, street: 'C. Torino', x: 162, y: 816 + r * 30, w: 38, h: 28, status: pickStatus(lotSeq), prototypeId: pickProto(lotSeq++) });
    const n3 = String(120 + r * 2);
    lots.push({ id: `M12-${n3}`, number: n3, manzana: 12, street: 'C. Palestro', x: 245, y: 816 + r * 30, w: 38, h: 28, status: pickStatus(lotSeq), prototypeId: pickProto(lotSeq++) });
    const n4 = String(121 + r * 2);
    lots.push({ id: `M12-${n4}`, number: n4, manzana: 12, street: 'C. Palestro', x: 287, y: 816 + r * 30, w: 38, h: 28, status: pickStatus(lotSeq), prototypeId: pickProto(lotSeq++) });
    const n5 = String(100 + r * 2);
    lots.push({ id: `M10-${n5}`, number: n5, manzana: 10, street: 'C. Amendola', x: 540, y: 816 + r * 30, w: 38, h: 28, status: pickStatus(lotSeq), prototypeId: pickProto(lotSeq++) });
    const n6 = String(101 + r * 2);
    lots.push({ id: `M9-${n6}`, number: n6, manzana: 9, street: 'C. Amendola', x: 640, y: 816 + r * 30, w: 42, h: 28, status: pickStatus(lotSeq), prototypeId: pickProto(lotSeq++) });
    const n7 = String(115 + r * 2);
    lots.push({ id: `M9-${n7}`, number: n7, manzana: 9, street: 'C. Metana', x: 686, y: 816 + r * 30, w: 42, h: 28, status: pickStatus(lotSeq), prototypeId: pickProto(lotSeq++) });
  }

  return {
    site: {
      brandName: 'Bienes Raíces Alvarado',
      eyebrow: 'DESARROLLOS RESIDENCIALES · PACHUCA',
      heroTitle: 'Encuentra el hogar que lo tiene todo.',
      heroSubtitle: 'Descubre el desarrollo perfecto para ti y tu familia.',
      heroImage: 'https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-1920x790.jpg',
      whatsapp: '525537560931',
      phoneDisplay: '+52 55 3756 0931'
    },
    developments,
    prototypes,
    lots
  };
}

function ensureDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = buildInitialData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  }
  return DB_PATH;
}

module.exports = { ensureDatabase, DB_PATH };
