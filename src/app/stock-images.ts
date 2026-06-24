export interface StockImage {
  url: string;
  alt: string;
  credit: string;
}

export type ImageSection = 'hero' | 'about' | 'services' | 'general';

const img = (id: string, alt: string, credit: string): StockImage => ({
  url: `https://images.unsplash.com/photo-${id}?w=800&q=80`,
  alt,
  credit,
});

export const STOCK_IMAGES: Record<string, Record<ImageSection, StockImage[]>> = {
  cleaner: {
    hero: [
      img('1581578731548-c64695cc6952', 'Professional cleaning service', 'JESHOOTS.COM'),
      img('1628177142898-93e36e4e3a50', 'Clean modern home interior', 'Sidekix Media'),
    ],
    about: [
      img('1556911220-bff31c812dba', 'Clean kitchen interior', 'Jason Briscoe'),
      img('1584622650111-993a426fbf0a', 'Cleaning team at work', 'Anton'),
    ],
    services: [
      img('1558618666-fcd25c85f82e', 'Window cleaning', 'JESHOOTS.COM'),
      img('1585421514284-efb74c2b69ba', 'Floor mopping', 'pan xiaozhen'),
    ],
    general: [
      img('1527515637462-cee1395c108d', 'Cleaning supplies', 'The Creative Exchange'),
    ],
  },
  barber: {
    hero: [
      img('1503951914875-452b00a37de8', 'Barbershop interior', 'Arthur Edelmans'),
      img('1599351431202-1e0f0137899a', 'Barber cutting hair', 'Thgusstavo Santana'),
    ],
    about: [
      img('1585747860019-f4e7fa2b6e30', 'Barber tools', 'Thgusstavo Santana'),
      img('1521590832167-7228fcab4f41', 'Classic barbershop chairs', 'Nathon Oski'),
    ],
    services: [
      img('1622286342461-8f85be0a56c8', 'Beard trim close-up', 'Allef Vinicius'),
      img('1605497788044-5a32c7078486', 'Hair styling', 'Adam Winger'),
    ],
    general: [
      img('1493256338651-d82f7acb2b38', 'Barbershop atmosphere', 'Agustin Fernandez'),
    ],
  },
  'personal trainer': {
    hero: [
      img('1534438327276-14e5300c3a48', 'Modern gym interior', 'Danielle Cerullo'),
      img('1571019614242-c5c5dee9f50b', 'Personal training session', 'Jonathan Borba'),
    ],
    about: [
      img('1549060279-7e168fcee0c2', 'Fitness coach', 'Jonathan Borba'),
      img('1576678927484-cc907957088c', 'Gym equipment', 'Risen Wang'),
    ],
    services: [
      img('1517836357463-d25dfeac3438', 'Weight training', 'Victor Freitas'),
      img('1518611012118-696072aa579a', 'Group fitness class', 'Geert Pieters'),
    ],
    general: [
      img('1526506118085-471d6164e8df', 'Active lifestyle', 'Karsten Winegeart'),
    ],
  },
  tutor: {
    hero: [
      img('1523050854058-8df90110c476', 'Student studying', 'Green Chameleon'),
      img('1497633762265-9d179a990aa6', 'Library books', 'Kimberly Farmer'),
    ],
    about: [
      img('1524178232363-1fb2b075b655', 'Tutoring session', 'Kenny Eliason'),
      img('1503676260728-1c00da094a0b', 'Classroom setting', 'MChe Lee'),
    ],
    services: [
      img('1456513080510-7bf3a84b82f8', 'Open textbook', 'Aaron Burden'),
      img('1434030216411-0b793f4b4173', 'Online learning', 'Green Chameleon'),
    ],
    general: [
      img('1513258496099-48168024aec0', 'Education concept', 'Element5 Digital'),
    ],
  },
  'lawn mowing': {
    hero: [
      img('1558904541-efa843a96f01', 'Beautiful lawn', 'Daniel Watson'),
      img('1592417817098-8fd3d9eb14a5', 'Garden landscaping', 'Petar Tonchev'),
    ],
    about: [
      img('1416879595882-3373a0480b5b', 'Green garden', 'Todd Quackenbush'),
      img('1585320806297-9794b3e4eeae', 'Mowing equipment', 'Daniel Watson'),
    ],
    services: [
      img('1564429238961-71748ccc7d38', 'Lawn mowing', 'Ochir-Erdene Oyunmedeg'),
      img('1585320806297-9794b3e4eeae', 'Hedge trimming', 'Daniel Watson'),
    ],
    general: [
      img('1500382017468-9049fed747ef', 'Backyard garden', 'Todd Quackenbush'),
    ],
  },
  mechanic: {
    hero: [
      img('1486262715619-67b85e0b08d3', 'Auto repair shop', 'Tim Mossholder'),
      img('1530046339160-ce3e530c7d2b', 'Car engine close-up', 'Sten Rademaker'),
    ],
    about: [
      img('1619642751034-765dfdf7c58e', 'Mechanic tools', 'Tekton'),
      img('1558618666-fcd25c85f82e', 'Workshop interior', 'JESHOOTS.COM'),
    ],
    services: [
      img('1487754180451-c456f719905b', 'Car maintenance', 'Markus Spiske'),
      img('1622186477895-f2af6a0f5a97', 'Tire change', 'Robert Laursoo'),
    ],
    general: [
      img('1492144534655-ae79c964c9d7', 'Car on road', 'Campbell'),
    ],
  },
  rental: {
    hero: [
      img('1564013799919-ab600027ffc6', 'Beautiful property', 'Outsite Co'),
      img('1502672260266-1c1ef2d93688', 'Modern apartment', 'Spacejoy'),
    ],
    about: [
      img('1560448204-e02f11c3d0e2', 'Cozy living room', 'Spacejoy'),
      img('1600585154340-be6161a56a0c', 'Property exterior', 'Frames For Your Heart'),
    ],
    services: [
      img('1522708323590-d24dbb6b0267', 'Apartment interior', 'Spacejoy'),
      img('1600607687939-ce8a6c25118c', 'Room detail', 'Francesca Tosolini'),
    ],
    general: [
      img('1600596542815-611d0b5dfa2d', 'House keys', 'Tierra Mallorca'),
    ],
  },
  cafe: {
    hero: [
      img('1554118811-1e0d58224f24', 'Coffee shop interior', 'Jason Leung'),
      img('1501339847302-ac426a4a7cbb', 'Cafe atmosphere', 'Brooke Cagle'),
    ],
    about: [
      img('1495474472287-4d71bcdd2085', 'Coffee cups', 'Nathan Dumlao'),
      img('1559305616-3f99cd43e353', 'Barista at work', 'Tyler Nix'),
    ],
    services: [
      img('1509042239860-f550ce710b93', 'Latte art', 'Nathan Dumlao'),
      img('1558961363-fa8fdf82db35', 'Pastry display', 'Mink Mingle'),
    ],
    general: [
      img('1442512595331-e89e73853f31', 'Coffee beans', 'Mike Kenneally'),
    ],
  },
  consultant: {
    hero: [
      img('1556761175-5973dc0f32d7', 'Business meeting', 'Austin Distel'),
      img('1497366216548-37526070297c', 'Modern office', 'Nastuh Abootalebi'),
    ],
    about: [
      img('1521737711867-e3b97375f902', 'Team collaboration', 'Annie Spratt'),
      img('1553877522-43269d4ea984', 'Strategy planning', 'Campaign Creators'),
    ],
    services: [
      img('1454165804606-c3d57bc86b40', 'Laptop work', 'Bench Accounting'),
      img('1542744173-8e7e91415f58', 'Presentation', 'Campaign Creators'),
    ],
    general: [
      img('1507003211169-0a1dd7228f2d', 'Professional portrait', 'Joseph Gonzalez'),
    ],
  },
  shop: {
    hero: [
      img('1441986300917-64674bd600d8', 'Retail store', 'Mike Petrucci'),
      img('1556742049-0cfed4f6a45d', 'Shopping bags', 'freestocks'),
    ],
    about: [
      img('1604719312566-8912e9227c6a', 'Shop shelves', 'Artificial Photography'),
      img('1555529669-e69e7aa0ba9a', 'Boutique interior', 'Charisse Kenion'),
    ],
    services: [
      img('1472851294608-062f824d29cc', 'Product display', 'Heidi Sandstrom'),
      img('1607082349566-187342175e2f', 'Checkout counter', 'Clay Banks'),
    ],
    general: [
      img('1528698827591-e625c94bc5ab', 'Open sign', 'Mike Petrucci'),
    ],
  },
  other: {
    hero: [
      img('1556761175-5973dc0f32d7', 'Professional team', 'Austin Distel'),
      img('1497366216548-37526070297c', 'Modern workspace', 'Nastuh Abootalebi'),
    ],
    about: [
      img('1521737711867-e3b97375f902', 'Team at work', 'Annie Spratt'),
      img('1507003211169-0a1dd7228f2d', 'Professional portrait', 'Joseph Gonzalez'),
    ],
    services: [
      img('1454165804606-c3d57bc86b40', 'Work in progress', 'Bench Accounting'),
      img('1553877522-43269d4ea984', 'Strategy session', 'Campaign Creators'),
    ],
    general: [
      img('1528698827591-e625c94bc5ab', 'Business open sign', 'Mike Petrucci'),
    ],
  },
};

export function getStockImages(businessType: string, section: ImageSection): StockImage[] {
  const typeImages = STOCK_IMAGES[businessType] || STOCK_IMAGES['other'];
  return [
    ...(typeImages?.[section] || []),
    ...(typeImages?.['general'] || []),
  ];
}
