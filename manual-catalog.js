/* Classify the signed-in Drive catalog by product, using the filename and its containing folder. */
(() => {
  const products = [
    {
      match: /\bwed4815ew1?\b/i, title: 'Whirlpool WED4815EW1 Dryer', category: 'Appliances', family: 'Dryers',
      photo: 'https://crdms.images.consumerreports.org/f_auto,w_640/prod/products/cr/models/377634-electricdryers-whirlpool-wed4815ew.png',
      source: 'https://www.consumerreports.org/appliances/clothes-dryers/whirlpool-wed4815ew/m377634/'
    },
    {
      match: /\b4[- ]bike hitch rack\b/i, title: 'Wel-Bilt 193024 4-Bike Hitch Rack', category: 'Cycling', family: 'Bike racks',
      photo: 'https://assets.northerntool.com/products/193/images/193024.jpg',
      source: 'https://www.northerntool.com/products/hitch-mounted-4-bike-rack-193024'
    },
    {
      match: /\bdcf510b?\b/i, title: 'DeWalt DCF510 Cordless Ratchet', category: 'Tools', family: 'Automotive tools',
      photo: 'https://assets.dewalt.com/NAG/PRODUCT/IMAGES/HIRES/WHITEBG/DCF510B_1_320.webp',
      source: 'https://www.dewalt.com/en-us/product/dcf510b/20v-xr-brushless-38-12-sealed-head-ratchet-tool-only'
    },
    {match: /masterbuilt.*(?:mb20070924|710)/i, title: 'Masterbuilt MB20070924 710 Digital Smoker', category: 'Outdoor & garden', family: 'Grills & smokers', photo: 'https://mobileimages.lowes.com/productimages/8b98bcc1-dba4-49ed-9f94-99dbcc11f214/65886723.jpeg', source: 'https://www.masterbuilt.com/products/710-wifi-digital-electric-smoker'},
    {match: /nuwave bravo xl/i, title: 'NuWave Bravo XL Smart Oven', category: 'Appliances', family: 'Kitchen appliances', photo: 'https://www.popsci.com/wp-content/uploads/2022/03/11/NuWave-Bravo-XL-best-smart-convection-oven.jpg?quality=85&w=768', source: 'https://www.popsci.com/reviews/best-smart-ovens/'},
    {
      match: /luminAID packlite nova usb/i, title: 'LuminAID PackLite Nova USB', category: 'Outdoor & garden', family: 'Camping & gear',
      photo: 'https://luminaid.com/cdn/shop/products/PLNVBProductandPackagingImage_Holidaytouch_square_1000x.jpg?v=1762209792',
      source: 'https://luminaid.com/products/packlite-nova-usb'
    },
    {
      match: /bose soundlink flex 2/i, title: 'Bose SoundLink Flex (2nd Gen)', category: 'Electronics', family: 'Computers & audio',
      photo: 'https://www.boseindia.com/cdn/shop/files/SLFLXII_Black_Back_RGB_result.webp?v=1745485782',
      source: 'https://www.boseindia.com/products/soundlink-flex-2nd-gen'
    },
    {
      match: /lenovo 510 fhd webcam/i, title: 'Lenovo 510 FHD Webcam', category: 'Electronics', family: 'Computers & audio',
      photo: 'https://multimedia.bbycastatic.ca/multimedia/products/500x500/194/19436/19436846.jpeg',
      source: 'https://www.bestbuy.ca/en-ca/product/lenovo-510-510-fhd-webcam-gxc1d66063/19436846'
    },
    {
      match: /bonsaii c275-a/i, title: 'Bonsaii C275-A Paper Shredder', category: 'Household', family: 'Office & home',
      photo: 'https://m.media-amazon.com/images/I/51-INjgTtBL.jpg',
      source: 'https://www.nellisauction.com/p/Bonsaii-12-Sheet-Cross-Cut-Paper-Shredder-5-5-Gal-Home-Office/31794667'
    },
    {
      match: /yeti tundra haul/i, title: 'YETI Tundra Haul Cooler', category: 'Outdoor & garden', family: 'Camping & gear',
      photo: 'https://au.yeti.com/cdn/shop/files/Tundra_Haul_Tan_Front_3338_B.png?v=1757389607&width=600',
      source: 'https://au.yeti.com/products/tundra-haul-hard-cooler'
    },
    {
      match: /kaiweets km100/i, title: 'KAIWEETS KM100 Digital Multimeter', category: 'Tools', family: 'Shop equipment',
      photo: 'https://kaiweets.com/cdn/shop/files/KAIWEETS-KM100-Digital-Multimeter.jpg?v=1721801039&width=600',
      source: 'https://kaiweets.com/products/km100-digital-multimeter'
    },
    {
      match: /dremel 395/i, title: 'Dremel 395 Rotary Tool', category: 'Tools', family: 'Shop equipment',
      photo: 'https://dispo.umich.edu/media/catalog/product/cache/7b374f089d37a02bf8f31cfed2275f0a/7/5/75695.jpg',
      source: 'https://dispo.umich.edu/dremel-multipro-395-type-5-rotary-tool-power-cable-included-with-cord-variable-speed.html'
    },
    {
      match: /fellowes powershred 6c/i, title: 'Fellowes Powershred 6C', category: 'Household', family: 'Office & home',
      photo: 'https://cdn.idealo.com/folder/Product/5878/5/5878547/s1_produktbild_max/fellowes-powershred-6c.jpg',
      source: 'https://www.idealo.de/preisvergleich/OffersOfProduct/5878547_-powershred-6c-fellowes.html'
    },
    {match: /heated blanket/i, title: 'Heated Blanket', category: 'Household', family: 'Bedding'}
  ];
  const rules = [
    ['Cycling','Bike racks', /\b(?:bicycles?|bikes?)\b.*\bracks?\b|\b(?:thule|yakima)\b.*\bbikes?\b/i],
    ['Cycling','Bikes & accessories', /\b(?:cycling|bicycles?|bike helmets?|e[- ]?bikes?)\b/i],
    ['Tools','Automotive tools', /\b(?:battery (?:load|charger)|trickle charger|jump starter|fuel (?:injection )?pressure test(?:er| kit)|fuel injection tester|pump puller|timing light|cordless ratchet|vacuum pump kit|loading ramps|obd2?)\b/i],
    ['Appliances','Dryers', /\b(?:dryer|dryers)\b/i],
    ['Appliances','Laundry & cleaning', /\b(?:washer|washing machine|vacuum|spotbot|bissell|carpet cleaner)\b/i],
    ['Appliances','Heating & cooling', /\b(?:air conditioner|heater|dehumidifier|humidifier|fireplace|refrigerator fan)\b/i],
    ['Outdoor & garden','Grills & smokers', /\b(?:smoker|barbecue|grill)\b/i],
    ['Outdoor & garden','Lawn equipment', /\b(?:lawn and garden|trimmer|mower|leaf blower|chainsaw|pole saw)\b/i],
    ['Appliances','Kitchen appliances', /\b(?:kitchen|refrigerator|air fryer|toaster|blender|oven|thermometer|coffee maker)\b/i],
    ['Automotive','RV accessories', /^(?:rv|motorhome)\s+-|\b(?:recreational vehicle|camper)\b/i],
    ['Automotive','Vehicle accessories', /\b(?:automotive|headlight|dash cam|backup camera|vehicle|motorcycle)\b/i],
    ['Tools','Shop equipment', /\b(?:tools?|hoist|paint sprayer|multimeter|air compressor|ultrasonic cleaner|rotary tool|soldering|weller)\b/i],
    ['Electronics','Lighting & power', /\b(?:electrical|floodlight|lights?|lighting|flashlight|power strip|extension cord|battery charger)\b/i],
    ['Electronics','Computers & audio', /\b(?:computers?|electronics|webcam|speaker|hdmi|mouse|radios?|television|dvd|router)\b/i],
    ['Outdoor & garden','Camping & gear', /\b(?:camping|outdoors?|cooler|lantern|kastking)\b/i],
    ['Pets','Crates & accessories', /\b(?:pets|icrate|kennel)\b/i],
    ['Household','Plumbing', /\b(?:plumbing|showerhead|water heater|leak detector)\b/i],
    ['Household','Safety & security', /\b(?:smoke|carbon monoxide|safety|security|padlock|garage door|gun safe)\b/i],
    ['Household','Office & home', /\b(?:household|office|shredder|sewing machine|storage box)\b/i]
  ];
  const prefix = /^(?:appliances|automotive|camping|computers|cycling|electrical|electronics|heating|household|kitchen|lawn and garden|office|outdoor|pets|plumbing|rv|safety|security|tools)\s+-\s+/i;
  const suffix = /\s+-\s+(?:(?:user|owner['’]s|installation|assembly|operating|programming|instruction|service|product|quick start)\s+)?(?:manual|instructions(?: for use)?|guide|parts|information|receipt|serial number|faq)(?:\s+-\s+.*)?$/i;
  const date = /\s+-\s+(?:installed\s+)?\d{4}-\d{2}(?:-\d{2})?$/i;
  const artifact = /^(.*?)\s+\(on\s+\d{1,2}-\d{1,2}-\d{4}\)\s+-\s+(.+)$/i;
  const keyOf = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const compare = (a, b) => a.localeCompare(b, undefined, {numeric: true});

  function identify(file) {
    const name = file.displayName;
    const folder = file.path.split(' / ').at(-1);
    const recovered = name.match(artifact);
    if (recovered || /^(?:Unidentified Scans|OneNote Indexes and Notes)$/.test(folder)) {
      const source = recovered?.[1].replace(/\.one$/i, '') || folder;
      const kind = /image\//.test(file.mime) ? 'Images' : 'Documents';
      return {category: 'Recovered files', family: source, title: source + ' ' + kind.toLowerCase(), archive: true};
    }
    const known = products.find(product => product.match.test(name + ' ' + folder));
    if (known) return known;
    const productFolder = !/^(?:Manuals|Recovered Manuals|Other Product Documents|Camping and Outdoor Gear|Exercise Equipment|Smoke and Carbon Monoxide Alarms|Garage Door Openers)$/.test(folder);
    const title = (productFolder ? folder : name.replace(prefix, '').replace(suffix, '').replace(date, '')).trim() || name;
    const context = name + ' ' + folder;
    const [category, family] = rules.find(([, , pattern]) => pattern.test(context)) || ['Household', 'Other equipment'];
    return {category, family, title};
  }

  function build(files) {
    const nodes = new Map();
    const groups = new Map();
    const byFile = new Map();
    const root = {id: '', title: 'Categories', children: new Map()};
    nodes.set('', root);
    function node(parent, title, extra = {}) {
      const id = parent.id + '/' + keyOf(title);
      if (!parent.children.has(id)) {
        const entry = {id, title, parent, children: new Map(), count: 0, ...extra};
        parent.children.set(id, entry);
        nodes.set(id, entry);
      }
      return parent.children.get(id);
    }
    for (const file of files) {
      const meta = identify(file);
      const category = node(root, meta.category);
      const family = node(category, meta.family);
      const group = node(family, meta.title, {photo: meta.photo, source: meta.source, files: []});
      group.files.push(file);
      for (const item of [category, family, group]) item.count++;
      groups.set(group.id, group);
      byFile.set(file.id, group);
      file.index += ' ' + keyOf([meta.title, meta.category, meta.family].join(' '));
    }
    for (const group of groups.values()) group.files.sort((a, b) => compare(a.displayName, b.displayName));
    return {root, nodes, byFile};
  }
  window.thManualCatalog = {build, compare};
})();
