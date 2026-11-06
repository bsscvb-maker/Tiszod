/* Classify the signed-in Drive catalog by product, using the filename and its containing folder. */
(() => {
  const covers = {
    Appliances: 'collection', Automotive: 27, Cycling: 1, Electronics: 13, Household: 14,
    'Outdoor & garden': 26, Pets: 15, 'Recovered files': 25, Tools: 9,
    'Bike racks': 2, 'Bikes & accessories': 3, Dryers: 4, 'Laundry & cleaning': 5,
    'Camping & gear': 6, 'Grills & smokers': 7, 'Lawn equipment': 8,
    'Automotive tools': 29, 'Vehicle accessories': 10, 'Kitchen appliances': 11,
    'Heating & cooling': 12, 'RV accessories': 28, 'Shop equipment': 30,
    'Lighting & power': 31, 'Computers & audio': 32, Plumbing: 33, 'Safety & security': 34,
    'Office & home': 35, Bedding: 36, 'Crates & accessories': 37,
    'Main dishes': 16, 'Desserts & baking': 17, 'Sides & appetizers': 18,
    Drinks: 19, 'Cookbooks & reference': 20, Pasta: 38, 'Soups & stews': 39,
    Breakfast: 40, Breads: 41, Cookies: 42, 'Cakes & pies': 43, Dips: 44, Casseroles: 45,
    'Online orders': 21, 'Store purchases': 22, 'Home & hardware': 23, 'Shipping & delivery': 24,
    Footwear: 46, Retailers: 47, Carriers: 48, Amazon: 49, 'Other records': 50, Beverages: 51, 'Books & collections': 52, 'Salads & sides': 53,
    'Meat, fish & poultry': 54, 'Other recipes': 55, 'Hardware stores': 56, 'Other sellers': 57,
    'Recovered & supporting records': 58, 'Other equipment': 59
  };
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
    {
      match: /husqvarna 330lk/i, title: 'Husqvarna 330LK String Trimmer', category: 'Outdoor & garden', family: 'Lawn equipment',
      photo: 'https://www.husqvarna.com/-/images/aprimo/husqvarna/grass-trimmers/photos/studio/pb-802186.webp?format=SCHEMA_ORG_1_1&v=c231c5f32a385d2a',
      source: 'https://www.husqvarna.com/us/string-trimmers/330lk/'
    },
    {
      match: /dewalt dcst970/i, title: 'DeWalt DCST970 String Trimmer', category: 'Outdoor & garden', family: 'Lawn equipment',
      photo: 'https://m.media-amazon.com/images/I/41kmgkFxTyL._US500_.jpg',
      source: 'https://snapklik.com/en-ca/product/dewalt-dcst970b-flexvolt-60v-max-cordless-string-trimmer-tool-only/02DR4PS7WHJ85'
    },
    {
      match: /otc 5630/i, title: 'OTC 5630 Fuel Pressure Test Kit', category: 'Tools', family: 'Automotive tools',
      photo: 'https://m.media-amazon.com/images/I/91Wx2oDbFTL._AC_US1200_.jpg',
      source: 'https://otctools.com/products/fuel-pressure-tester-kit'
    },
    {
      match: /orion motor tech power steering/i, title: 'Orion Motor Tech Power Steering Pump Puller Set', category: 'Tools', family: 'Automotive tools',
      photo: 'https://orionmotortech.com/cdn/shop/files/1_b278d27b-1d0f-43e3-8b26-5b28f6e0af77.jpg?v=1719386708',
      source: 'https://orionmotortech.com/products/power-steering-pump-pulley-puller-installer-tool-set-pump-pulley-remover-installer-tools'
    },
    {
      match: /fookoo dw7y5/i, title: 'Fookoo DW7Y5(XT) Rear Camera', category: 'Automotive', family: 'RV accessories',
      photo: 'https://m.media-amazon.com/images/I/515w%2BeGz1EL._AC_SL1500_.jpg',
      source: 'https://manuals.plus/asin/B0D3GCSKM3'
    },
    {
      match: /fookoo hd 1080p wireless backup camera system/i, title: 'Fookoo DW7Y5 Backup Camera System', category: 'Automotive', family: 'RV accessories',
      photo: 'https://m.media-amazon.com/images/I/51mdhnCaaZL._AC_SL1500_.jpg',
      source: 'https://manuals.plus/asin/B0CL76NS25'
    },
    {
      match: /folosem 12v refrigerator fan/i, title: 'Folosem 12V RV Refrigerator Fan', category: 'Automotive', family: 'RV accessories',
      photo: 'https://m.media-amazon.com/images/I/61VBnagUoCL.jpg',
      source: 'https://manuals.plus/asin/B0DK57PT6Z'
    },
    {
      match: /lutec motion activated floodlight/i, title: 'LUTEC Motion-Activated Floodlight', category: 'Electronics', family: 'Lighting & power'
    },
    {
      match: /weller 9400/i, title: 'Weller 9400 Soldering Gun', category: 'Tools', family: 'Shop equipment',
      photo: 'https://mobileimages.lowes.com/productimages/26f184a9-3572-4036-9c83-990b80f0562e/15596865.jpg',
      source: 'https://www.lowes.com/pd/Weller-Electric-Lead-Free-Soldering-Kit/1000395569'
    },
    {
      match: /master lock 647d/i, title: 'Master Lock 647D Combination Padlock', category: 'Household', family: 'Safety & security',
      photo: 'https://thegardenstore.com/cdn/shop/products/5236914.jpg?v=1679848946',
      source: 'https://thegardenstore.com/products/master-lock-1-3-16in-wide-set-your-own-combination-lock-647d'
    },
    {
      match: /wyze cam pan v4/i, title: 'Wyze Cam Pan v4 Security Camera', category: 'Household', family: 'Safety & security',
      photo: 'https://www.wyze.com/cdn/shop/files/wyze-cam-pan-v4-wyze-labs-inc-6982259.jpg?v=1775153016&width=1946',
      source: 'https://www.wyze.com/products/wyze-cam-pan-v4'
    },
    {match: /bicycle helmet/i, title: 'Bell Bicycle Helmet', category: 'Cycling', family: 'Bikes & accessories', art: 61},
    {match: /headlight warning buzzer/i, title: 'Headlight Warning Buzzer', category: 'Automotive', family: 'Vehicle accessories'},
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

  function identifyManual(file) {
    const name = file.displayName;
    const folder = file.path.split(' / ').at(-1);
    const recovered = name.match(artifact);
    if (recovered || /^(?:Unidentified Scans|OneNote Indexes and Notes)$/.test(folder)) {
      const source = recovered?.[1].replace(/\.one$/i, '') || folder;
      const kind = /image\//.test(file.mime) ? 'Images' : 'Documents';
      return {category: 'Recovered files', family: source, title: source + ' ' + kind.toLowerCase()};
    }
    const known = products.find(product => product.match.test(name + ' ' + folder));
    if (known) return known;
    const productFolder = !/^(?:Manuals|Recovered Manuals|Other Product Documents|Camping and Outdoor Gear|Exercise Equipment|Smoke and Carbon Monoxide Alarms|Garage Door Openers)$/.test(folder);
    const title = (productFolder ? folder : name.replace(prefix, '').replace(suffix, '').replace(date, '')).trim() || name;
    const context = name + ' ' + folder;
    const [category, family] = rules.find(([, , pattern]) => pattern.test(context)) || ['Household', 'Other equipment'];
    return {category, family, title};
  }

  const featuredRecipes = [
    [/banana bread/i, 76, 'Desserts & baking', 'Breads'],
    [/^biscuits!?$/i, 77, 'Desserts & baking', 'Breads'],
    [/hardee.*biscuits/i, 78, 'Desserts & baking', 'Breads'],
    [/howard johnson.*boston brown bread/i, 79, 'Desserts & baking', 'Breads'],
    [/kenny rogers.*corn muffins/i, 80, 'Desserts & baking', 'Breads'],
    [/twisted lemonade/i, 81, 'Drinks', 'Beverages'],
    [/burger king.*breakfast/i, 82, 'Main dishes', 'Breakfast'],
    [/mcdonald.*ham.*bagel/i, 126, 'Main dishes', 'Breakfast'],
    [/mcdonald.*steak.*bagel/i, 127, 'Main dishes', 'Breakfast'],
    [/mcdonald.*omelet.*bagel/i, 128, 'Main dishes', 'Breakfast'],
    [/yogurt parfait/i, 129, 'Main dishes', 'Breakfast'], [/apple muffin/i, 130],
    [/egg mcmuffin/i, 83, 'Main dishes', 'Breakfast'],
    [/quiche/i, 84, 'Main dishes', 'Breakfast'],
    [/bacon cheeseburger dip/i, 85, 'Sides & appetizers', 'Dips'],
    [/apple pie pops/i, 86], [/fondue/i, 87], [/buffalo chicken crescent/i, 88],
    [/cinnamon.*bundt/i, 89], [/pumpkin.*che[ez]+[sc]ecake/i, 90],
    [/mac and cheese|macaroni.*cheese/i, 91], [/chicken wings/i, 92],
    [/tex mex casserole|tex-mex casserole/i, 93], [/pulled pork/i, 94],
    [/sundried tomato.*pasta/i, 95], [/whipped cream/i, 96], [/pink punch/i, 97],
    [/sugar cookies/i, 98], [/mashed potato casserole/i, 99], [/cinnamon carrots/i, 100],
    [/barbecue ribs|bbq ribs/i, 111], [/taco dip/i, 112], [/lemonade/i, 113],
    [/smoothie/i, 114], [/milkshake|mcdonald.*shakes/i, 115, 'Drinks', 'Beverages'],
    [/pancakes?/i, 116], [/waffles?/i, 117], [/omele[tt]+e?/i, 118], [/french toast/i, 119],
    [/breakfast burrito/i, 120, 'Main dishes', 'Breakfast'], [/brownies/i, 121],
    [/chocolate cake/i, 122], [/\bpie\b/i, 123], [/muffins?/i, 124],
    [/biscuits.*gravy/i, 150, 'Main dishes', 'Breakfast'],
    [/biscuits/i, 77, 'Desserts & baking', 'Breads'],
    [/ribs/i, 131], [/\b(?:cheeseburger|big king|bigxtra|arch deluxe)\b/i, 132, 'Main dishes', 'Meat, fish & poultry'],
    [/pot pie/i, 133, 'Main dishes', 'Casseroles'], [/\bchili\b/i, 135, 'Main dishes', 'Soups & stews'],
    [/coleslaw/i, 137], [/ranch dressing/i, 138], [/\b(?:bbq|barbecue) sauce\b/i, 139], [/mustard/i, 140, 'Sides & appetizers', 'Salads & sides'],
    [/fudge/i, 143], [/pudding/i, 144], [/ice cream/i, 145], [/stir.fry/i, 146], [/seafood/i, 147], [/steak/i, 148], [/carrot cake/i, 149]
  ];
  const recipeFamilyArt = {
    Beverages: 113, 'Books & collections': 75, Cookies: 98, 'Cakes & pies': 123, Breads: 125,
    Dips: 112, 'Salads & sides': 100, Pasta: 95, 'Soups & stews': 39, Breakfast: 116,
    Casseroles: 99, 'Meat, fish & poultry': 71, 'Other recipes': 65
  };

  function identifyRecipe(file) {
    const title = file.displayName.replace(/[«»]/g, '').replace(/[_]+/g, ' ').replace(/\s*-\s*Printer Friendly\b/ig, '')
      .replace(/\s+(?:recipe|recipes)(?=\s+-|$)/ig, '').replace(/\s+-\s+Allrecipes$/i, '').trim() || file.displayName;
    const rules = [
      ['Drinks','Beverages', /\b(punch|lemonade|smoothie|cocktail|milkshake|sangria|mojito|beverage|drink)\b/i],
      ['Cookbooks & reference','Books & collections', /\b(cookbook|ebook|collection|index|baking book|eat what you love)\b/i],
      ['Desserts & baking','Cookies', /\b(cookie|cookies|shortbread|brownies|biscotti)\b/i],
      ['Desserts & baking','Cakes & pies', /\b(cake|cakes|cheesecake|cheezecake|bundt|pies?|tart|fudge|dessert|pudding|ice cream)\b/i],
      ['Desserts & baking','Breads', /\b(bread|biscuits|muffin|muffins|rolls|scones|dough)\b/i],
      ['Sides & appetizers','Dips', /\b(dip|dips|fondue|salsa|hummus|guacamole)\b/i],
      ['Sides & appetizers','Salads & sides', /\b(salad|slaw|side dish|coleslaw|carrots|mashed potato|sweet potatoes|dressing|sauce|appetizer)\b/i],
      ['Main dishes','Pasta', /\b(pasta|spaghetti|lasagna|macaroni|mac and cheese|fettuccine|ravioli)\b/i],
      ['Main dishes','Soups & stews', /\b(soup|chili|stew|chowder|gumbo|bisque)\b/i],
      ['Main dishes','Breakfast', /\b(quiche|pancake|waffle|omelet|breakfast|frittata|french toast)\b/i],
      ['Main dishes','Casseroles', /\b(casserole|pasta bake|pot pie|crescent ring)\b/i],
      ['Main dishes','Meat, fish & poultry', /\b(chicken|beef|pork|turkey|salmon|tuna|fish|shrimp|steak|burger|ribs|barbecue|meatloaf)\b/i]
    ];
    const example = featuredRecipes.find(([pattern]) => pattern.test(title));
    const [category, family] = example?.[2] ? example.slice(2) : rules.find(([, , pattern]) => pattern.test(title)) || ['Cookbooks & reference', 'Other recipes'];
    if (/howard johnson.*boston brown bread/i.test(title)) return {
      category, family, title, art: 41,
      photo: 'https://images.squarespace-cdn.com/content/v1/63cdc8f90de33a009e0349bf/3801fbbf-cb1f-4500-b88e-fbd556e8ede0/Boston%2BBrown%2BBread.JPG',
      source: 'https://www.tastinghistory.com/recipes/bostonbrownbread', illustrative: true
    };
    return {category, family, title, art: example?.[1] ?? recipeFamilyArt[family]};
  }

  function identifyPurchase(file) {
    const original = file.displayName;
    const exported = original.replace(/\s*\[[a-f\d]{8}\]$/i, '').replace(/^(.*?)\.one\s*(?:\(On [^)]+\)\s*)+-\s*/i, '');
    const context = original + ' ' + file.path;
    let category, family;
    if (/\b(?:fedex|ups|usps|dhl|tracking|proof of delivery|shipping receipt)\b/i.test(exported)) {
      category = 'Shipping & delivery';
      family = 'Carriers';
    } else if (/\b(?:amazon|amzn)\b/i.test(context)) {
      category = 'Online orders';
      family = 'Amazon';
    } else if (/\b(?:home depot|lowe['’]?s|ace hardware|harbor freight|northern tool|menards)\b/i.test(context)) {
      category = 'Home & hardware';
      family = 'Hardware stores';
    } else if (/\b(?:freebirds?|shoes|boots|footwear|cole haan|nordstrom)\b/i.test(context)) {
      category = 'Store purchases';
      family = 'Footwear';
    } else if (/\b(?:walmart|target|costco|kroger|best buy|dry cleaning|cleaners|retail)\b/i.test(context)) {
      category = 'Store purchases';
      family = 'Retailers';
    } else if (/\b(?:order|invoice|receipt|purchase)\b/i.test(exported)) {
      category = 'Online orders';
      family = 'Other sellers';
    } else {
      category = 'Other records';
      family = 'Recovered & supporting records';
    }
    const title = exported.trim() || original;
    if (/amazon.*samsonite luggage/i.test(original)) return {
      category, family, title: 'Samsonite Evolve SE Army Green Luggage Set',
      art: 103, photo: 'https://m.media-amazon.com/images/I/81Gpylnvs-L._AC_SL1500_.jpg',
      source: 'https://www.amazon.com/dp/B0CPGWJ6NX'
    };
    if (/mopar transmission oil filter/i.test(original)) return {
      category, family, title: 'Mopar 68224232AA Transmission Oil Filter',
      art: 104, photo: 'https://www.wheelerfleet.com/ProductImage/get-file/ProductImages/1567166226.jpg',
      source: 'https://www.wheelerfleet.com/product/filter/454274'
    };
    const art = [
      [/\bfedex\b/i, 101], [/\bdoggie gate\b/i, 105], [/\bboots?\b/i, 106],
      [/\bshirts?\b/i, 107], [/\b(?:shoes|cole haan)\b/i, 108], [/\b(?:cleaning|cleaners)\b/i, 109],
      [/\b(?:home depot|lowe['’]?s|ace hardware|harbor freight|northern tool)\b/i, 110]
    ].find(([pattern]) => pattern.test(title))?.[1] ??
      ({Amazon: 102, Carriers: 48, 'Hardware stores': 110, Footwear: 46, Retailers: 47, 'Other sellers': 57, 'Recovered & supporting records': 58})[family];
    return {category, family, title, art};
  }

  function build(files, section) {
    const classify = {Manuals: identifyManual, Recipes: identifyRecipe, Purchases: identifyPurchase}[section];
    const nodes = new Map();
    const byFile = new Map();
    const root = {id: '', title: 'Categories', children: new Map(), count: 0};
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
      const meta = classify(file);
      const category = node(root, meta.category, {art: covers[meta.category]});
      const family = node(category, meta.family, {art: covers[meta.family]});
      const group = node(family, meta.title, {art: meta.art, photo: meta.photo, source: meta.source, illustrative: meta.illustrative, files: []});
      group.files.push(file);
      for (const item of [root, category, family, group]) item.count++;
      byFile.set(file.id, group);
      file.index += ' ' + keyOf([meta.title, meta.category, meta.family].join(' '));
    }
    for (const entry of nodes.values()) entry.files?.sort((a, b) => compare(a.displayName, b.displayName));
    return {root, nodes, byFile};
  }
  window.thLibraryCatalog = {build, compare};
})();
