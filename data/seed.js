const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function buildInitialData() {
  const commonFeatures = [
    'Acceso controlado',
    'Áreas verdes',
    'Canchas de usos múltiples',
    'Ciclovía',
    'Comunidad familiar',
    'Juegos infantiles',
    'Parque canino',
    'Salón de eventos',
    'Servicio de vigilancia 24/7'
  ];

  const prototypes = [
    {
      id: 'areni',
      propertyId: '20021',
      name: 'Areni',
      price: 1382000,
      bedrooms: 2,
      bathrooms: 1,
      area: 90,
      parking: 2,
      developments: ['oporto'],
      description: 'Diseño funcional y luminoso ideal para parejas o familias jóvenes, con excelente distribución en terreno de 90 m².',
      features: commonFeatures,
      image: '/assets/images/casa-2.jpg',
      video: ''
    },
    {
      id: 'arveto',
      propertyId: '20022',
      name: 'Arveto',
      price: 1660000,
      bedrooms: 2,
      bathrooms: 1.5,
      area: 90,
      parking: 2,
      developments: ['ardenza', 'montalese', 'oporto', 'vittoria'],
      description: 'Residencia contemporánea de 2 recámaras y 1.5 baños con espacios integrados y acabados de primera.',
      features: commonFeatures,
      image: '/assets/images/casa-3.jpg',
      video: ''
    },
    {
      id: 'brachetto',
      propertyId: '20023',
      name: 'Brachetto',
      price: 1847000,
      bedrooms: 3,
      bathrooms: 1.5,
      area: 78,
      parking: 2,
      developments: ['ardenza', 'montalese', 'oporto', 'vittoria'],
      description: 'Tres recámaras optimizadas en un proyecto inteligente con iluminación natural y 2 cajones de estacionamiento.',
      features: commonFeatures,
      image: '/assets/images/casa-4.jpg',
      video: ''
    },
    {
      id: 'belat',
      propertyId: '20024',
      name: 'Belat',
      price: 1865000,
      bedrooms: 2,
      bathrooms: 1.5,
      area: 80,
      parking: 2,
      developments: ['ardenza', 'montalese', 'oporto', 'vittoria'],
      description: 'Estilo minimalista con sala-comedor amplia, cocina equipada y patio trasero privado.',
      features: commonFeatures,
      image: '/assets/images/casa-5.png',
      video: ''
    },
    {
      id: 'moscatel',
      propertyId: '20025',
      name: 'Moscatel',
      price: 1905000,
      bedrooms: 3,
      bathrooms: 1.5,
      area: 105,
      parking: 2,
      developments: ['ardenza', 'oporto', 'vittoria'],
      description: 'Terreno de 105 m² con 3 recámaras, ideal para crecer en familia dentro de privada con amenidades.',
      features: commonFeatures,
      image: '/assets/images/casa-3.jpg',
      video: ''
    },
    {
      id: 'carlina',
      propertyId: '20026',
      name: 'Carlina',
      price: 1970000,
      bedrooms: 3,
      bathrooms: 2.5,
      area: 105,
      parking: 2,
      developments: ['ardenza', 'montalese', 'oporto', 'vittoria'],
      description: 'Tres recámaras y 2.5 baños con recámara principal amplia, vestidor y excelente orientación.',
      features: commonFeatures,
      image: '/assets/images/casa-1.jpg',
      video: ''
    },
    {
      id: 'belora',
      propertyId: '20027',
      name: 'Belora',
      price: 2320000,
      bedrooms: 3,
      bathrooms: 2,
      area: 113,
      parking: 2,
      developments: ['oporto'],
      description: 'Amplitud en cada nivel sobre 113 m² de terreno, pensada para confort y privacidad familiar.',
      features: commonFeatures,
      image: '/assets/images/casa-2.jpg',
      video: ''
    },
    {
      id: 'ruche',
      propertyId: '20028',
      name: 'Ruche',
      price: 2600000,
      bedrooms: 3,
      bathrooms: 2.5,
      area: 105,
      parking: 2,
      developments: ['ardenza', 'montalese', 'sorento'],
      description: 'Arquitectura moderna con doble altura parcial, 3 recámaras y 2.5 baños.',
      features: commonFeatures,
      image: '/assets/images/casa-4.jpg',
      video: ''
    },
    {
      id: 'loureira',
      propertyId: '20029',
      name: 'Loureira',
      price: 2920000,
      bedrooms: 3,
      bathrooms: 3.5,
      area: 123,
      parking: 2,
      developments: ['sorento'],
      description: 'Cada recámara con baño completo más medio baño de visitas, acabados residenciales premium.',
      features: commonFeatures,
      image: '/assets/images/casa-1.jpg',
      video: ''
    },
    {
      id: 'gracciano',
      propertyId: '20030',
      name: 'Gracciano',
      price: 3345000,
      bedrooms: 3,
      bathrooms: 3.5,
      area: 140,
      parking: 2,
      developments: ['sorento'],
      description: 'Amplia residencia en terreno de 140 m² con jardín interior, roof garden opcional y 3.5 baños.',
      features: commonFeatures,
      image: '/assets/images/casa-5.png',
      video: ''
    },
    {
      id: 'malvasia',
      propertyId: '20031',
      name: 'Malvasia',
      price: 4500000,
      bedrooms: 4,
      bathrooms: 5,
      area: 242,
      parking: 2,
      developments: ['sorento'],
      description: 'Nuestra residencia insignia de 4 recámaras, 5 baños y 242 m² de terreno con espacios de lujo.',
      features: commonFeatures,
      image: '/assets/images/casa-1.jpg',
      video: ''
    },
    {
      id: 'flat-1',
      propertyId: '20032',
      name: 'Flat 1',
      type: 'departamento',
      price: 1544000,
      bedrooms: 2,
      bathrooms: 1,
      area: 68,
      parking: 1,
      developments: ['torres-qavalta'],
      description: 'Departamento funcional en Torre A de 67.94 m² con 2 recámaras, 1 baño completo, sala-comedor, cocina integral y 1 cajón de estacionamiento.',
      features: ['Acceso controlado', 'Elevadores', 'Áreas verdes', 'Salón multiusos', 'Servicio de vigilancia 24/7'],
      image: '/assets/images/torres/flat1-1.webp',
      gallery: [
        '/assets/images/torres/flat1-1.webp',
        '/assets/images/torres/flat1-2.webp',
        '/assets/images/torres/flat1-3.webp'
      ],
      video: ''
    },
    {
      id: 'flat-2',
      propertyId: '20033',
      name: 'Flat 2',
      type: 'departamento',
      price: 1743000,
      bedrooms: 2,
      bathrooms: 2.5,
      area: 77,
      parking: 1,
      developments: ['torres-qavalta'],
      description: 'Departamento amplio en Torre A de 73.33 a 77.45 m² con 2 recámaras, 2.5 baños, acabados contemporáneos y 1 cajón de estacionamiento.',
      features: ['Acceso controlado', 'Elevadores', 'Áreas verdes', 'Salón multiusos', 'Servicio de vigilancia 24/7'],
      image: '/assets/images/torres/flat2-1.webp',
      gallery: [
        '/assets/images/torres/flat2-1.webp',
        '/assets/images/torres/flat2-2.webp',
        '/assets/images/torres/flat2-3.webp'
      ],
      video: ''
    }
  ];

  const developments = [
    {
      id: 'sorento',
      name: 'Sorento',
      tagline: 'Privada residencial con casa club y alberca',
      startingPrice: 2600000,
      image: '/assets/images/casa-1.jpg'
    },
    {
      id: 'oporto',
      name: 'Oporto',
      tagline: 'Canchas deportivas y amplias áreas verdes',
      startingPrice: 1500000,
      image: '/assets/images/casa-2.jpg'
    },
    {
      id: 'ardenza',
      name: 'Ardenza',
      tagline: 'Acceso controlado y arquitectura contemporánea',
      startingPrice: 1770000,
      image: '/assets/images/casa-3.jpg'
    },
    {
      id: 'montalese',
      name: 'Montalese',
      tagline: 'Diseño familiar con calles tranquilas',
      startingPrice: 1660000,
      image: '/assets/images/casa-4.jpg'
    },
    {
      id: 'torres-qavalta',
      name: 'Torres Qavalta',
      tagline: 'Departamentos modernos con vista panorámica',
      startingPrice: 1544000,
      image: '/assets/images/torres/flat1-1.webp'
    },
    {
      id: 'vittoria',
      name: 'Vittoria',
      tagline: 'Privada estrella con parque central y glorieta',
      startingPrice: 1550000,
      image: '/assets/images/casa-1.jpg'
    }
  ];

  // Generación fiel a la geometría de la fotografía (viewBox 1000 x 1000)
  // El fraccionamiento tiene forma trapezoidal: más angosto arriba y más ancho abajo,
  // con C. Paseo Vittoria serpenteando alrededor del parque central y la glorieta.
  const lots = [];
  const protoIds = prototypes.map(p => p.id);

  function seeded(n) {
    const x = Math.sin(n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }
  function pickStatus(idx) {
    const r = seeded(idx);
    if (r < 0.22) return 'disponible';
    if (r < 0.88) return 'no_disponible';
    return 'vendido';
  }
  function pickProto(idx) {
    return protoIds[Math.floor(seeded(idx + 77) * protoIds.length)];
  }

  let seq = 1;
  const pushLot = (id, number, manzana, street, x, y, w, h, angle = 0) => {
    lots.push({
      id,
      number: String(number),
      manzana,
      street,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      w: Math.round(w * 10) / 10,
      h: Math.round(h * 10) / 10,
      angle,
      status: pickStatus(seq),
      prototypeId: pickProto(seq++)
    });
  };

  // Helper para bloques de 2 filas (con ancho variable en cada fila para respetar curvas/diagonales)
  function addCurvedBlock(manzana, street, xTop, wTop, xBot, wBot, y, h, colsTop, colsBot, startTop, startBot, hasGreenCenter = false) {
    const gap = hasGreenCenter ? 28 : 10;
    const rowH = (h - gap) / 2;
    const stepTop = wTop / colsTop;
    for (let i = 0; i < colsTop; i++) {
      const num = startTop - i * 2;
      pushLot(`M${manzana}-${num}`, num, manzana, street, xTop + i * stepTop, y, stepTop - 1.5, rowH);
    }
    const stepBot = wBot / colsBot;
    for (let i = 0; i < colsBot; i++) {
      const num = startBot - i * 2;
      pushLot(`M${manzana}-${num}`, num, manzana, street, xBot + i * stepBot, y + rowH + gap, stepBot - 1.5, rowH);
    }
  }

  // 1. Tira superior (Manzana 1: 162 -> 100)
  for (let i = 0; i < 32; i++) {
    const num = 162 - i * 2;
    pushLot(`M1-${num}`, num, 1, 'C. Senia Norte', 202 + i * 18.8, 28, 17.2, 36);
  }

  // 2. Perímetro Izquierdo inclinado (C. Cairoli: 101 -> 173) - más separado de manzanas
  for (let i = 0; i < 36; i++) {
    const t = i / 35;
    const y = 30 + t * 864;
    const x = 148 - t * 88;
    const num = 101 + i * 2;
    pushLot(`PI-${num}`, num, 15, 'C. Cairoli', x, y, 28, 21, 5.8);
  }

  // 3. Perímetro Derecho ligeramente inclinado (C. Metana: 101 -> 171) - más separado
  for (let i = 0; i < 36; i++) {
    const t = i / 35;
    const y = 30 + t * 864;
    const x = 842 - t * 34;
    const num = 101 + i * 2;
    pushLot(`PD-${num}`, num, 7, 'C. Metana', x, y, 28, 21, 2.2);
  }

  // 4. Columna Izquierda de Manzanas (19, 18, 17, 16, 14) dejando amplio corredor para Paseo Vittoria
  addCurvedBlock(19, 'C. Senia', 202, 246, 198, 248, 92, 86, 12, 12, 153, 154, false);
  addCurvedBlock(18, 'C. Colombo', 190, 256, 184, 254, 214, 102, 14, 14, 147, 126, true);
  // Manzana 17 y 16 abrazan la glorieta
  addCurvedBlock(17, 'C. Leopardi', 176, 252, 170, 226, 352, 86, 12, 11, 123, 120, false);
  addCurvedBlock(16, 'C. Magenta', 164, 228, 158, 252, 496, 86, 11, 12, 121, 124, false);
  addCurvedBlock(14, 'C. Martino', 146, 282, 140, 294, 620, 102, 15, 16, 131, 146, true);

  // 5. Columna Derecha de Manzanas (2, 3, 4, 6, 8)
  addCurvedBlock(2, 'C. Senia', 524, 272, 524, 270, 92, 86, 14, 14, 129, 128, false);
  addCurvedBlock(3, 'C. Colombo', 580, 210, 580, 208, 214, 102, 10, 10, 119, 120, true);
  addCurvedBlock(4, 'C. Milano', 580, 204, 580, 202, 352, 86, 9, 9, 117, 116, false);
  addCurvedBlock(6, 'C. Panti', 578, 198, 578, 196, 496, 86, 8, 8, 115, 116, false);
  addCurvedBlock(8, 'C. Marmora', 574, 194, 574, 192, 620, 102, 9, 9, 117, 114, true);

  // 6. Lotes junto al Parque Central (Manzana 5: 135..119 arriba y 117..101 abajo)
  for (let i = 0; i < 9; i++) {
    const num = 135 - i * 2;
    pushLot(`M5-${num}`, num, 5, 'C. Paseo Vittoria', 528, 214 + i * 19.5, 24, 18);
  }
  for (let i = 0; i < 9; i++) {
    const num = 117 - i * 2;
    pushLot(`M5-${num}`, num, 5, 'C. Paseo Vittoria', 528, 548 + i * 19.5, 24, 18);
  }

  // 7. Fila Inferior de Manzanas (13, 12, 11, 10, 9) bajo C. Torino
  // Manzana 13
  for (let i = 0; i < 5; i++) {
    const num = 133 - i * 2;
    pushLot(`M13-${num}`, num, 13, 'C. Torino', 128 + i * 22, 756, 20.5, 36);
  }
  for (let r = 0; r < 4; r++) {
    pushLot(`M13-${100 + r * 2}`, 100 + r * 2, 13, 'C. Cairoli', 126, 796 + r * 23, 38, 21);
    pushLot(`M13-${101 + r * 2}`, 101 + r * 2, 13, 'C. Palestro', 194, 796 + r * 23, 38, 21);
  }
  // Manzana 12
  for (let i = 0; i < 5; i++) {
    const num = 123 - i * 2;
    pushLot(`M12-${num}`, num, 12, 'C. Torino', 256 + i * 22, 756, 20.5, 36);
  }
  for (let r = 0; r < 4; r++) {
    pushLot(`M12-${100 + r * 2}`, 100 + r * 2, 12, 'C. Palestro', 254, 796 + r * 23, 38, 21);
    pushLot(`M12-${101 + r * 2}`, 101 + r * 2, 12, 'C. Avenusti', 322, 796 + r * 23, 38, 21);
  }
  // Manzana 11 & 10 (flanqueando la caseta de acceso)
  for (let r = 0; r < 4; r++) {
    pushLot(`M11-${100 + r * 2}`, 100 + r * 2, 11, 'C. Avenusti', 388, 766 + r * 28, 36, 25);
    pushLot(`M10-${100 + r * 2}`, 100 + r * 2, 10, 'C. Amendola', 520, 766 + r * 28, 36, 25);
  }
  // Manzana 9
  for (let i = 0; i < 7; i++) {
    const num = 113 - i * 2;
    pushLot(`M9-${num}`, num, 9, 'C. Torino', 580 + i * 23, 756, 21.5, 36);
  }
  for (let r = 0; r < 4; r++) {
    pushLot(`M9-${115 + r * 2}`, 115 + r * 2, 9, 'C. Amendola', 580, 796 + r * 23, 44, 21);
    pushLot(`M9-${100 + r * 2}`, 100 + r * 2, 9, 'C. Metana', 694, 796 + r * 23, 44, 21);
  }

  return {
    site: {
      brandName: 'Bienes Raíces Alvarado',
      eyebrow: 'DESARROLLOS RESIDENCIALES · PACHUCA',
      heroTitle: 'Encuentra el hogar que lo tiene todo.',
      heroSubtitle: 'Descubre el desarrollo perfecto para ti y tu familia.',
      heroImage: '/assets/images/hero.jpg',
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
  } else {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Si es versión anterior (sin lots con angle o menos de 300 lotes o versión previa antes del ajuste de calles)
    if (!parsed.lots || parsed.lots.length < 300 || !parsed.mapVersion || parsed.mapVersion < 3) {
      const fresh = buildInitialData();
      fresh.mapVersion = 3;
      fresh.site = parsed.site || fresh.site;
      fresh.developments = parsed.developments || fresh.developments;
      fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), 'utf8');
    } else if (raw.includes('bienesraicesalvarado.com.mx/wp-content/')) {
      const migrated = raw
        .replaceAll('https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-1920x790.jpg', '/assets/images/hero.jpg')
        .replaceAll('https://bienesraicesalvarado.com.mx/wp-content/uploads/2025/05/20241030_1040343-525x328.jpg', '/assets/images/casa-1.jpg')
        .replaceAll('https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/07/20220221_114215-525x328.jpg', '/assets/images/casa-2.jpg')
        .replaceAll('https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Moscatell-525x328.jpg', '/assets/images/casa-3.jpg')
        .replaceAll('https://bienesraicesalvarado.com.mx/wp-content/uploads/2024/04/Ruche-525x328.jpg', '/assets/images/casa-4.jpg')
        .replaceAll('https://bienesraicesalvarado.com.mx/wp-content/uploads/2026/06/FACHADAS-WEB-3-525x328.png', '/assets/images/casa-5.png');
      fs.writeFileSync(DB_PATH, migrated, 'utf8');
    } else if (!parsed.catalogVersion || parsed.catalogVersion < 2) {
      const fresh = buildInitialData();
      parsed.developments = fresh.developments;
      parsed.prototypes = fresh.prototypes;
      parsed.catalogVersion = 2;
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
    }
  }
  return DB_PATH;
}

module.exports = { ensureDatabase, DB_PATH };
