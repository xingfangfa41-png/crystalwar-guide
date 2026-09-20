var nbsPlaylists = JSON.parse(localStorage.getItem("EC_NBS_PLAYLISTS") || "{}");
if(!nbsPlaylists["喜欢"]) nbsPlaylists["喜欢"] = JSON.parse(localStorage.getItem("EC_NBS_FAVS") || "[]");
var nbsSearchQ = "";
var nbsTab = "all";
var nbsCurrentPlaylist = "";

/* 常见歌曲中文翻译 */
var SONG_TRANSLATIONS = {
  "14th Song": "14th Song",
  "1812overture": "1812序曲",
  "7thelement": "7thelement",
  "A Little Piece of Heaven": "一小片天堂",
  "A Nightmare Before Christmas": "圣诞夜惊魂",
  "Africa": "非洲",
  "Ahrix - Left Behind": "Ahrix - 被抛下",
  "Ahrix - Nova": "Ahrix - 新星",
  "Ahxello - Frisbee": "Ahxello - 飞盘",
  "Ahxello - Light Speed": "Ahxello - 光速",
  "Alan Walker - Alone": "艾伦·沃克 - 孤独",
  "Alan Walker - Big Universe": "Alan Walker - 浩瀚宇宙",
  "Alan Walker - Fade": "艾伦·沃克 - 渐逝",
  "Alan Walker - Force": "Alan Walker - 力量",
  "Alan Walker - Spectre": "艾伦·沃克 - 幽灵",
  "Alex Skrindo - Jumbo": "Alex Skrindo - 巨型",
  "Alex Skrindo _ Stahl! - Moments": "Alex Skrindo _ Stahl! - 瞬间",
  "All Star": "全明星",
  "Animals": "动物农场",
  "Another One Bites the Dust": "又一个倒下了",
  "Archie V. - Magic Is Timeless": "Archie V. - 魔法永恒",
  "Asd - Thank you": "Asd - 谢谢你",
  "Astronomia": "棺材舞",
  "Audioscribe - Free Fall": "Audioscribe - 自由落体",
  "Auld Lang Syne": "友谊地久天长",
  "Awolnation - Sail": "Awolnation - Sail",
  "Axel F - Beverly Hills Cop": "Axel F - Beverly Hills Cop",
  "Axel F - Remastered": "Axel F - Remastered",
  "Bad Apple": "坏苹果",
  "Bad apple 3": "Bad apple 3",
  "Bangarang": "狂欢",
  "Beat it": "躲开",
  "Beliver": "信徒",
  "Billie Jean": "比利·简",
  "Bleach - Stand Up Be Strong": "Bleach - Stand Up Be Strong",
  "BlindingLights": "BlindingLights",
  "Blue_Monday": "Blue_Monday",
  "Bohemian Rhapsody": "波西米亚狂想曲",
  "BowsersCastle": "BowsersCastle",
  "Buildmeupbuttercup": "Buildmeupbuttercup",
  "Call Me Maybe": "有空打给我",
  "Can You Feel the Love": "Can You Feel the Love",
  "Candyland": "糖果乐园",
  "Canon in D": "D大调卡农",
  "Canon in D(Fsharp)": "Canon in D(Fsharp)",
  "Cant Take my eyes Off Of You": "Cant Take my eyes Off Of You",
  "CaptainSparklez  Revenge": "CaptainSparklez  Revenge",
  "Cara Mia": "Cara Mia",
  "Carol of the Bells": "Carol of the Bells",
  "Castle Crashers - Shop and Blacksmith Theme": "Castle Crashers - Shop and Blacksmith Theme",
  "Castle Crashers - Snow World Winterbliss": "Castle Crashers - Snow World Winterbliss",
  "Castle Crashers - The Necromancer": "Castle Crashers - The Necromancer",
  "Cat's In the Cradle": "Cat's In the Cradle",
  "Centerfold": "Centerfold",
  "Charlie Brown": "Charlie Brown",
  "Chen Yue - Flowers in a riot of color": "Chen Yue - Flowers in a riot of color",
  "Civilization I Theme": "Civilization I Theme",
  "Clock Tower (Zelda)": "Clock Tower (Zelda)",
  "Clocks": "Clocks",
  "Cloud 9": "九霄云外",
  "Counting Stars": "Counting Stars",
  "Crab Rave": "螃蟹狂欢",
  "DJ Got Us Fallin in Love": "DJ Got Us Fallin in Love",
  "DJ Got Us Fallin' in Love": "DJ Got Us Fallin' in Love",
  "DJVI - Moonstone": "DJVI - Moonstone",
  "Dance Monkey": "Dance Monkey",
  "Day_N_Night": "Day_N_Night",
  "Defqwop - Heart Afire (feat. Strix)": "Defqwop - Heart Afire (feat. Strix)",
  "Demons": "恶魔",
  "Desmeon - Back From The Dead": "Desmeon - Back From The Dead",
  "Desmeon - Hellcat": "Desmeon - Hellcat",
  "Desmeon - Undone (feat. Steklo)": "Desmeon - Undone (feat. Steklo)",
  "Different Heaven - Far Away": "Different Heaven - Far Away",
  "Different Heaven - Nekozilla": "Different Heaven - Nekozilla",
  "Disfigure - Blank": "Disfigure - Blank",
  "Disneys Grosse Pause": "Disneys Grosse Pause",
  "Distrion _ Alex Skrindo - Entropy": "Distrion _ Alex Skrindo - Entropy",
  "Distrion _ Electro-Light - Rubik": "Distrion _ Electro-Light - Rubik",
  "Distrion _ Electro-Light ft. Ke'nekt - You And Me": "Distrion _ Electro-Light ft. Ke'nekt - You And Me",
  "Disturbance": "Disturbance",
  "Dixie Land": "Dixie Land",
  "Dont Stop Me Now": "Dont Stop Me Now",
  "Downtown": "Downtown",
  "Dream Lover": "Dream Lover",
  "Duck Tales - Boss Theme": "Duck Tales - Boss Theme",
  "Duck Tales Theme": "Duck Tales Theme",
  "Duel of the Fates": "Duel of the Fates",
  "Dueling Banjos": "Dueling Banjos",
  "Dwarf Fortress - Main Theme": "Dwarf Fortress - Main Theme",
  "Dynamite": "Dynamite",
  "Elektronomia - Desire": "Elektronomia - Desire",
  "Elektronomia - Energy": "Elektronomia - Energy",
  "Elektronomia - Vision": "Elektronomia - Vision",
  "Elektronomia _ Stahl! - Journey": "Elektronomia _ Stahl! - Journey",
  "EnV - Ginseng": "EnV - Ginseng",
  "Every Teardrop is a Waterfall": "Every Teardrop is a Waterfall",
  "Everybody Dance Now": "Everybody Dance Now",
  "Fairy Tail Theme": "Fairy Tail Theme",
  "Fellowship of the ring": "Fellowship of the ring",
  "Fireflies": "Fireflies",
  "Fix You": "Fix You",
  "Flight of The Bumblebee": "Flight of The Bumblebee",
  "Float On": "Float On",
  "Footloose": "Footloose",
  "Freebird": "Freebird",
  "Friends in Low Places": "Friends in Low Places",
  "Frosty the Snowman": "Frosty the Snowman",
  "Fuer Elise": "Fuer Elise",
  "Fugue In D Minor": "Fugue In D Minor",
  "Fur Elise": "Fur Elise",
  "Gangnam Style": "Gangnam Style",
  "GerudoValley": "GerudoValley",
  "Get Lucky": "Get Lucky",
  "Get Ready For This": "Get Ready For This",
  "Ghostbusters": "Ghostbusters",
  "Giant Woman": "Giant Woman",
  "Giorno Giovana theme": "Giorno Giovana theme",
  "Grand Theft Auto - Vice City Theme": "Grand Theft Auto - Vice City Theme",
  "Grandma Got Run Over by a Reindeer": "Grandma Got Run Over by a Reindeer",
  "Gravity Falls - Main Theme": "Gravity Falls - Main Theme",
  "Gravity Falls Theme": "Gravity Falls Theme",
  "Grenade2.0": "Grenade2.0",
  "Guns n Roses - Dont cry": "Guns n Roses - Dont cry",
  "Guren No Yumiya": "Guren No Yumiya",
  "Hakuna Matata": "Hakuna Matata",
  "Hall of Fame": "Hall of Fame",
  "Halvorsen - Wouldn't Change It": "Halvorsen - Wouldn't Change It",
  "Hanging tree": "Hanging tree",
  "Happy": "Happy",
  "He's A Pirate": "He's A Pirate",
  "Heart Attack": "Heart Attack",
  "Heidi": "Heidi",
  "Hellberg _ Tobu - Sprinkles": "Hellberg _ Tobu - Sprinkles",
  "Hello": "你好",
  "Heroes of Might and Magic 3 - Main Theme": "Heroes of Might and Magic 3 - Main Theme",
  "Hey Soul Sister": "Hey Soul Sister",
  "Hotel California": "Hotel California",
  "Housewell _ Side-B feat. Karl VanBurkleo - Drifting Away": "Housewell _ Side-B feat. Karl VanBurkleo - Drifting Away",
  "Hurts Like Heaven": "Hurts Like Heaven",
  "I Am the Doctor": "I Am the Doctor",
  "I Knew You Were Trouble": "I Knew You Were Trouble",
  "I'm an Albatraoz": "I'm an Albatraoz",
  "Idontwanttosettheworldonfire": "Idontwanttosettheworldonfire",
  "In the Hall of the Mountain King": "In the Hall of the Mountain King",
  "Indiana Jones - Main Theme": "Indiana Jones - Main Theme",
  "Indiana Jones Theme": "Indiana Jones Theme",
  "It's My Life": "It's My Life",
  "Itro - Panda": "Itro - Panda",
  "Itro _ Kontinuum - Alive": "Itro _ Kontinuum - Alive",
  "Itro _ Tobu - Cloud 9": "Itro _ Tobu - Cloud 9",
  "Itro _ Tobu - Holiday": "Itro _ Tobu - Holiday",
  "JJD - Skyhigh": "JJD - Skyhigh",
  "James Bond Theme": "James Bond Theme",
  "Janji - Dawn": "Janji - Dawn",
  "Janji - Heroes Tonight (feat. Johnning)": "Janji - Heroes Tonight (feat. Johnning)",
  "Janji - Horizon": "Janji - Horizon",
  "Janji - Shadows": "Janji - Shadows",
  "Janji - Summer Memories": "Janji - Summer Memories",
  "Janji feat. TR - Milky Way Stars": "Janji feat. TR - Milky Way Stars",
  "Jensation - Donuts": "Jensation - Donuts",
  "Jim Yosef - Arrow": "Jim Yosef - Arrow",
  "Jim Yosef - Eclipse": "Jim Yosef - Eclipse",
  "Jim Yosef - Firefly": "Jim Yosef - Firefly",
  "Jim Yosef - Lights": "Jim Yosef - Lights",
  "Jim Yosef - Unicorn": "Jim Yosef - Unicorn",
  "Jim Yosef - Voices": "Jim Yosef - Voices",
  "Jim Yosef _ Alex Skrindo - Passion": "Jim Yosef _ Alex Skrindo - Passion",
  "Joy to the World": "Joy to the World",
  "Just Give Me a Reason": "Just Give Me a Reason",
  "K-391 - Earth": "K-391 - Earth",
  "K-391 - Farmers Hockey Exclusive Feat. Gjermund Olstad": "K-391 - Farmers Hockey Exclusive Feat. Gjermund Olstad",
  "K-391 - Summertime": "K-391 - Summertime",
  "K-391 - Windows": "K-391 - Windows",
  "K-391 – Everybody": "K-391 – Everybody",
  "K.Safo _ Alex Skrindo - Future Vibes (feat. Stewart Wallace)": "K.Safo _ Alex Skrindo - Future Vibes (feat. Stewart Wallace)",
  "Kid Icarus - Overworld Theme": "Kid Icarus - Overworld Theme",
  "Kirby's Dreamland": "Kirby's Dreamland",
  "Kirbys Dreamland Intro": "Kirbys Dreamland Intro",
  "Korol i Shut - Evil Genius Dance": "Korol i Shut - Evil Genius Dance",
  "Kygo - Stay (ft. Maty Noyes)": "Kygo - Stay (ft. Maty Noyes)",
  "Laszlo - Fall To Light": "Laszlo - Fall To Light",
  "Laszlo - Imaginary Friends": "Laszlo - Imaginary Friends",
  "Let It Be": "Let It Be",
  "Let It Go": "Let It Go",
  "Levels": "Levels",
  "Lost Woods": "Lost Woods",
  "Luigi's Mansion": "Luigi's Mansion",
  "MINE DIAMONDS": "MINE DIAMONDS",
  "MO - Kamikaze": "MO - Kamikaze",
  "Mad World": "Mad World",
  "Magic": "Magic",
  "Maja Francis - Come Companion (Tobu Remix)": "Maja Francis - Come Companion (Tobu Remix)",
  "Major Lazer - Cold Water (feat. Justin Bieber _ M¥) EASY": "Major Lazer - Cold Water (feat. Justin Bieber _ M¥) EASY",
  "Mako - Beam": "Mako - Beam",
  "Mako - Smoke Filled Room": "Mako - Smoke Filled Room",
  "Martin Garrix - Poison": "Martin Garrix - Poison",
  "Martin Garrix _ Jay Hardway - Spotless": "Martin Garrix _ Jay Hardway - Spotless",
  "Martin Garrix _ Mesto - WIEE": "Martin Garrix _ Mesto - WIEE",
  "Martin Garrix ft. John _ Michel - Now That I've Found You": "Martin Garrix ft. John _ Michel - Now That I've Found You",
  "Metal Slug - Mission 4": "Metal Slug - Mission 4",
  "Monody": "Monody",
  "Moonlight Sonata": "Moonlight Sonata",
  "Morrowind - Main Theme": "Morrowind - Main Theme",
  "Mortal Combat 2 - Theme": "Mortal Combat 2 - Theme",
  "Mortal Kombat Theme": "Mortal Kombat Theme",
  "MortalKombat": "MortalKombat",
  "Moves Like Jagger": "Moves Like Jagger",
  "Never Gonna Give You Up": "永不放弃你",
  "Numb": "麻木",
  "Nutcracker Dance of the Sugar Plum Fairies": "Nutcracker Dance of the Sugar Plum Fairies",
  "Nutcracker Russian Dance": "Nutcracker Russian Dance",
  "Nutcracker Waltz": "Nutcracker Waltz",
  "Nyan Cat": "彩虹猫",
  "OMFG - Hello": "OMFG - Hello",
  "OMFG - I Love You": "OMFG - I Love You",
  "OMFG - Wonderful": "OMFG - Wonderful",
  "Ob-La-Di, Ob-La-Da": "Ob-La-Di, Ob-La-Da",
  "Ode an die Freude": "Ode an die Freude",
  "Ode to Joy": "Ode to Joy",
  "On Our Way": "On Our Way",
  "Only You (and you alone)": "Only You (and you alone)",
  "Oppan Gangnam Style": "Oppan Gangnam Style",
  "Ouset Island WindWaker": "Ouset Island WindWaker",
  "PPAP": "PPAP",
  "Pallet Town Theme": "Pallet Town Theme",
  "Papermoon": "Papermoon",
  "Papers Please - Main Theme": "Papers Please - Main Theme",
  "Paradise": "Paradise",
  "Party Rock Anthem": "Party Rock Anthem",
  "Payphone": "Payphone",
  "Peanut's Theme": "Peanut's Theme",
  "Perry The Platypus Theme (Extended)": "Perry The Platypus Theme (Extended)",
  "Pink Panther - Theme": "Pink Panther - Theme",
  "Pirates of the Caribbean - He's a Pirate": "Pirates of the Caribbean - He's a Pirate",
  "Pokemon - Theme - John Loeffler": "Pokemon - Theme - John Loeffler",
  "Pokemon Center": "Pokemon Center",
  "Pokemon Center Theme": "Pokemon Center Theme",
  "Pokemon Red-Blue Title": "Pokemon Red-Blue Title",
  "Pokemon Theme": "Pokemon Theme",
  "Pokemon Theme Song": "Pokemon Theme Song",
  "Positive Force (VVVVVV)": "Positive Force (VVVVVV)",
  "Prefekt - Numb ft. Johnning": "Prefekt - Numb ft. Johnning",
  "Princess of China": "Princess of China",
  "Pushing Onwards (VVVVVV)": "Pushing Onwards (VVVVVV)",
  "Put Your Head On my Shoulder": "Put Your Head On my Shoulder",
  "Radioactive": "Radioactive",
  "RainbowTylenol": "RainbowTylenol",
  "Raindrops Keep Falling On My Head": "Raindrops Keep Falling On My Head",
  "Refrain of the Lovely Great war": "Refrain of the Lovely Great war",
  "Reptilia": "Reptilia",
  "RetroVision - Heroes": "RetroVision - Heroes",
  "RetroVision - Puzzle": "RetroVision - Puzzle",
  "Roar": "Roar",
  "Rock and Roll All Night": "Rock and Roll All Night",
  "Rude": "Rude",
  "Runescape 1": "Runescape 1",
  "Runescape 2": "Runescape 2",
  "Russian Anthem": "Russian Anthem",
  "STALKER - Guitar": "STALKER - Guitar",
  "Sacrificial (Binding of Isaac)": "Sacrificial (Binding of Isaac)",
  "Sailor Moon - Soundtrack": "Sailor Moon - Soundtrack",
  "Santeria": "Santeria",
  "Scary Monsters And Nice Sprites": "Scary Monsters And Nice Sprites",
  "Scary_Monsters_And_Nice_Sprites": "Scary_Monsters_And_Nice_Sprites",
  "Sherlock Main Theme (Acoustic)": "Sherlock Main Theme (Acoustic)",
  "Smells Like Teen Spirit": "Smells Like Teen Spirit",
  "Somebody That I Used to Know": "Somebody That I Used to Know",
  "Spektrem - Shine": "Spektrem - Shine",
  "Sponge Bob - Main Theme": "Sponge Bob - Main Theme",
  "Star Spangled Banner": "Star Spangled Banner",
  "Star Wars March Theme": "Star Wars March Theme",
  "StarFox64Theme": "StarFox64Theme",
  "Starlyte _ Jim Yosef - Leviathan": "Starlyte _ Jim Yosef - Leviathan",
  "Steerner x Tobu - Alive": "Steerner x Tobu - Alive",
  "Steins Gate": "Steins Gate",
  "Steven Universe Theme": "Steven Universe Theme",
  "Still Alive": "Still Alive",
  "Stronghold - Castle Jam": "Stronghold - Castle Jam",
  "Super Mario Bros 3 Athletic": "Super Mario Bros 3 Athletic",
  "Super Metroid Theme": "Super Metroid Theme",
  "Superstition": "Superstition",
  "Sweater Weather": "Sweater Weather",
  "Sweden": "瑞典",
  "Sweet Child of Mine": "Sweet Child of Mine",
  "Sword Art Online - Lizbeths Theme": "Sword Art Online - Lizbeths Theme",
  "Sword Art Online - Main theme": "Sword Art Online - Main theme",
  "Take Back the Night": "Take Back the Night",
  "Take On Me": "带上我",
  "Team Fortress 2 - Engineer theme": "Team Fortress 2 - Engineer theme",
  "Tetris 1989 - Song B": "Tetris 1989 - Song B",
  "Tetris A Theme": "Tetris A Theme",
  "Tetris B Theme": "Tetris B Theme",
  "The A Team": "The A Team",
  "The Addams Family - Game theme": "The Addams Family - Game theme",
  "The Avengers Movie (Guitar)": "The Avengers Movie (Guitar)",
  "The Entertainer": "The Entertainer",
  "The Final Countdown": "The Final Countdown",
  "The Fox": "The Fox",
  "The Lazy Song": "The Lazy Song",
  "The Legend of Zelda Theme": "The Legend of Zelda Theme",
  "The Pretender": "The Pretender",
  "The Scientist": "The Scientist",
  "The Witcher - Theme": "The Witcher - Theme",
  "TheFatRat - Jackpot": "TheFatRat - Jackpot",
  "TheFatRat - Monody (feat. Laura Brehm)": "TheFatRat - Monody (feat. Laura Brehm)",
  "TheFatRat - Never Be Alone": "TheFatRat - Never Be Alone",
  "TheFatRat - No No No": "TheFatRat - No No No",
  "TheFatRat - Windfall": "TheFatRat - Windfall",
  "Through the Fire and Flames": "Through the Fire and Flames",
  "Tobu - Cacao": "Tobu - Cacao",
  "Tobu - Caelum": "Tobu - Caelum",
  "Tobu - Candyland": "Tobu - Candyland",
  "Tobu - Colors": "Tobu - Colors",
  "Tobu - Damn Son": "Tobu - Damn Son",
  "Tobu - Dreams": "Tobu - Dreams",
  "Tobu - Good Times": "Tobu - Good Times",
  "Tobu - Higher": "Tobu - Higher",
  "Tobu - Hope": "Tobu - Hope",
  "Tobu - Infectious": "Tobu - Infectious",
  "Tobu - Legacy": "Tobu - Legacy",
  "Tobu - Life": "Tobu - Life",
  "Tobu - Mesmerize": "Tobu - Mesmerize",
  "Tobu - My own paradise": "Tobu - My own paradise",
  "Tobu - Natural High": "Tobu - Natural High",
  "Tobu - Puzzle": "Tobu - Puzzle",
  "Tobu - Reflection": "Tobu - Reflection",
  "Tobu - Roots": "Tobu - Roots",
  "Tobu - Seven": "Tobu - Seven",
  "Tobu - Sound of Goodbye": "Tobu - Sound of Goodbye",
  "Tobu - Such Fun": "Tobu - Such Fun",
  "Tobu _ Alex Skrindo - Smile": "Tobu _ Alex Skrindo - Smile",
  "Tobu _ Etori - Vicious": "Tobu _ Etori - Vicious",
  "Tobu _ Itro - Fantasy": "Tobu _ Itro - Fantasy",
  "Tobu _ Itro - Magic": "Tobu _ Itro - Magic",
  "Tobu _ Itro - Sunburst": "Tobu _ Itro - Sunburst",
  "Tobu _ Jim Yosef - Miracle": "Tobu _ Jim Yosef - Miracle",
  "Tobu _ Jordan Kelvin James - Summer Breeze": "Tobu _ Jordan Kelvin James - Summer Breeze",
  "Tobu _ Marcus Mouya - Running Away": "Tobu _ Marcus Mouya - Running Away",
  "Tobu _ Syndec - Dusk": "Tobu _ Syndec - Dusk",
  "Tobu _ William Ekh - Let It Be Now (ft. Brenton Mattheus)": "Tobu _ William Ekh - Let It Be Now (ft. Brenton Mattheus)",
  "Tom Spander - Explore": "Tom Spander - Explore",
  "Tom Spander - Far Away": "Tom Spander - Far Away",
  "Tom Spander - Fire": "Tom Spander - Fire",
  "Tom Spander - Fresh Start": "Tom Spander - Fresh Start",
  "Tom Spander - Haunted By The Past": "Tom Spander - Haunted By The Past",
  "Tom Spander - Lucky Days": "Tom Spander - Lucky Days",
  "Tom Spander - Onwards and Upwards": "Tom Spander - Onwards and Upwards",
  "Tom Spander - Stardust": "Tom Spander - Stardust",
  "TownMarket": "TownMarket",
  "Tuen - Spare": "Tuen - Spare",
  "Turkish March": "Turkish March",
  "Twelve Days of Christmas": "Twelve Days of Christmas",
  "Undertale - Bonetrousle": "Undertale - Bonetrousle",
  "Undertale - Megalovania": "Undertale - Megalovania",
  "Vanilla Twilight": "Vanilla Twilight",
  "Vince The II - Gates (Trick2g)": "Vince The II - Gates (Trick2g)",
  "Viva La Vida": "Viva La Vida",
  "Vorinini - Main Theme": "Vorinini - Main Theme",
  "Waiting For Love": "Waiting For Love",
  "Wake Me Up": "唤醒我",
  "Want You Gone - Simplified": "Want You Gone - Simplified",
  "We're not Gonna Take It": "We're not Gonna Take It",
  "WeDidn'tStartTheFire-BillyJoel": "WeDidn'tStartTheFire-BillyJoel",
  "What is Love": "What is Love",
  "Whatever Gets You thru the night": "Whatever Gets You thru the night",
  "When I Was Your Man": "When I Was Your Man",
  "Where No One Goes": "Where No One Goes",
  "William Ekh - Adventures (feat. Alexa Lusader)": "William Ekh - Adventures (feat. Alexa Lusader)",
  "Wind Waker Title": "Wind Waker Title",
  "Winter Wrap Up": "Winter Wrap Up",
  "Wizards in Winter": "Wizards in Winter",
  "Wontolla, Kasger _ Limitless - Miles Away": "Wontolla, Kasger _ Limitless - Miles Away",
  "World of Warcraft - Tavern Theme": "World of Warcraft - Tavern Theme",
  "Zelda Theme tune": "Zelda Theme tune",
  "addamsfamily": "addamsfamily",
  "adelehello": "adelehello",
  "alliwantforchristmasisyou": "alliwantforchristmasisyou",
  "art tatum 1": "art tatum 1",
  "athousandmiles": "athousandmiles",
  "axelf": "axelf",
  "babyimyours": "babyimyours",
  "bad guy": "bad guy",
  "barbiegirl": "barbiegirl",
  "beetlejuice": "beetlejuice",
  "bigtimerush": "bigtimerush",
  "bla1": "bla1",
  "bla2": "bla2",
  "bla3": "bla3",
  "boulevardofbrokendreams": "boulevardofbrokendreams",
  "cantinaband": "cantinaband",
  "carelesswhisper": "carelesswhisper",
  "charliebrownthanksgiving": "charliebrownthanksgiving",
  "comeoneileen": "comeoneileen",
  "dancingqueen": "dancingqueen",
  "dejavu": "dejavu",
  "delfinosquare": "delfinosquare",
  "despacito": "despacito",
  "dieinafire": "dieinafire",
  "dksummit": "dksummit",
  "dreamon": "dreamon",
  "everythingisawesome": "everythingisawesome",
  "faded": "faded",
  "feelgoodinc": "feelgoodinc",
  "figure8circuit": "figure8circuit",
  "fireandflames": "fireandflames",
  "floralshoppe": "floralshoppe",
  "flymetothemoon": "flymetothemoon",
  "fnafsong": "fnafsong",
  "gambianationalanthem": "gambianationalanthem",
  "garfieldandfriends": "garfieldandfriends",
  "get stickbugged lol": "get stickbugged lol",
  "gettinjiggywithit": "gettinjiggywithit",
  "globglobglob": "globglobglob",
  "gravityfalls": "gravityfalls",
  "harderbetterfasterstronger": "harderbetterfasterstronger",
  "harrypotter": "harrypotter",
  "herecomesthesun": "herecomesthesun",
  "heyjude": "heyjude",
  "heytheredelilah": "heytheredelilah",
  "hipsdontlie": "hipsdontlie",
  "hitormiss": "hitormiss",
  "homealone2": "homealone2",
  "hotelcalifornia": "hotelcalifornia",
  "hotlinebling": "hotlinebling",
  "hysteria": "hysteria",
  "igotafeeling": "igotafeeling",
  "igotnotime": "igotnotime",
  "imagine": "imagine",
  "imaine mod1": "imaine mod1",
  "interstellar": "interstellar",
  "intheairtonight": "intheairtonight",
  "itookapillinibiza": "itookapillinibiza",
  "itsbeensolong": "itsbeensolong",
  "iwanttoholdyourhand": "iwanttoholdyourhand",
  "jellyfishjam": "jellyfishjam",
  "jinglebells": "jinglebells",
  "jujuonthatbeat": "jujuonthatbeat",
  "jurassicpark": "jurassicpark",
  "lastchristmas": "lastchristmas",
  "let it be 1": "let it be 1",
  "letitbe": "letitbe",
  "linkin_park-burn_it_down": "linkin_park-burn_it_down",
  "luigicircuit": "luigicircuit",
  "luigismansion": "luigismansion",
  "mapletreeway": "mapletreeway",
  "marchtothescaffold": "marchtothescaffold",
  "mariocircuit": "mariocircuit",
  "mariokartcourseselect": "mariokartcourseselect",
  "megalovania": "megalovania",
  "merrygoroundoflife": "merrygoroundoflife",
  "miichannel": "miichannel",
  "monstermash": "monstermash",
  "moomoomeadows": "moomoomeadows",
  "mrbluesky": "mrbluesky",
  "mrbrightside": "mrbrightside",
  "mushroomgorge": "mushroomgorge",
  "oceanman": "oceanman",
  "omfghello": "omfghello",
  "paintitblack": "paintitblack",
  "penpineapple": "penpineapple",
  "plasticlove": "plasticlove",
  "pokemontheme": "pokemontheme",
  "pretenders mod1": "pretenders mod1",
  "pumpedupkicks": "pumpedupkicks",
  "rainbowroad": "rainbowroad",
  "redbone": "redbone",
  "resonance": "resonance",
  "ridindirty": "ridindirty",
  "rudolphtherednosedreindeer": "rudolphtherednosedreindeer",
  "safeandsound": "safeandsound",
  "sandstorm": "sandstorm",
  "sarajevo": "sarajevo",
  "scatman": "scatman",
  "scoobydoo": "scoobydoo",
  "seeyouagain": "seeyouagain",
  "seinfeld": "seinfeld",
  "september": "september",
  "sevennationarmy": "sevennationarmy",
  "shakeitoff": "shakeitoff",
  "shootingstars": "shootingstars",
  "sleighride": "sleighride",
  "song of storms": "song of storms",
  "songtest": "songtest",
  "sonictheme": "sonictheme",
  "sovietanthem": "sovietanthem",
  "spookyscaryskeletons": "spookyscaryskeletons",
  "stairwaytoheaven": "stairwaytoheaven",
  "starwars": "starwars",
  "strawberryfieldsforever": "strawberryfieldsforever",
  "street spirit 1": "street spirit 1",
  "sweetchildomine": "sweetchildomine",
  "thelonius_monk_around_midnight": "thelonius_monk_around_midnight",
  "thisisamerica": "thisisamerica",
  "thriller": "thriller",
  "throughthefireandflames": "throughthefireandflames",
  "thunderstruck": "thunderstruck",
  "tiktok": "tiktok",
  "tnt": "tnt",
  "toadsfactory": "toadsfactory",
  "tomfoolery": "tomfoolery",
  "tunaktunaktun": "tunaktunaktun",
  "turkishmarch": "turkishmarch",
  "umathurman": "umathurman",
  "uptownfunk": "uptownfunk",
  "users_7bopdkFTNFYcobU4OMGU0Lpk03C3_songs_Fnaf4": "users_7bopdkFTNFYcobU4OMGU0Lpk03C3_songs_Fnaf4",
  "wake me up 1": "wake me up 1",
  "wakemeupinside": "wakemeupinside",
  "waltzoftheflowers": "waltzoftheflowers",
  "waluigipinball": "waluigipinball",
  "want you gone": "want you gone",
  "wearenumberone": "wearenumberone",
  "wearethechampions": "wearethechampions",
  "weareyoung": "weareyoung",
  "wethands": "wethands",
  "whatyouknow": "whatyouknow",
  "wherethehoodat": "wherethehoodat",
  "wiisports": "wiisports",
  "wiisportsresort": "wiisportsresort",
  "workhardplayhard": "workhardplayhard",
  "xfiles": "xfiles",
  "ymca": "ymca",
  "youreposted": "youreposted",
};

function npGetDisplayName(title){
  // 优先显示翻译，没有翻译就显示原名
  return SONG_TRANSLATIONS[title] || title;
}
function npIsInPlaylist(title, plName){
  if(!nbsPlaylists[plName]) return false;
  return nbsPlaylists[plName].indexOf(title) !== -1;
}
function npToggleSongInPlaylist(title, plName){
  if(!nbsPlaylists[plName]) nbsPlaylists[plName] = [];
  var i = nbsPlaylists[plName].indexOf(title);
  if(i === -1) nbsPlaylists[plName].push(title);
  else nbsPlaylists[plName].splice(i,1);
  localStorage.setItem("EC_NBS_PLAYLISTS", JSON.stringify(nbsPlaylists));
  if(plName === "喜欢") localStorage.setItem("EC_NBS_FAVS", JSON.stringify(nbsPlaylists["喜欢"]));
  npBuildList();
}
function npCreatePlaylist(name){
  if(nbsPlaylists[name]) return false;
  nbsPlaylists[name] = [];
  localStorage.setItem("EC_NBS_PLAYLISTS", JSON.stringify(nbsPlaylists));
  return true;
}

function npFilteredList(){
  var all = EC_NBS.playlist();
  var q = nbsSearchQ.toLowerCase().trim();
  var filtered = all;
  if(nbsTab === "fav") filtered = filtered.filter(function(p){ return npIsInPlaylist(p.title, "喜欢"); });
  if(nbsTab === "playlist") filtered = filtered.filter(function(p){ return npIsInPlaylist(p.title, nbsCurrentPlaylist); });
  if(q) filtered = filtered.filter(function(p){ 
    return p.title.toLowerCase().indexOf(q) !== -1 || (SONG_TRANSLATIONS[p.title] || "").toLowerCase().indexOf(q) !== -1; 
  });
  return filtered;
}

function npBuildList(){
  if(!window.EC_NBS) return;
  var box = $("#npList"); box.innerHTML = "";
  var allPlaylist = EC_NBS.playlist();
  
  // 歌单标签页：先显示歌单列表（没选具体歌单的时候）
  if(nbsTab === "playlist" && !nbsCurrentPlaylist){
    // 新建歌单按钮
    var createBtn = document.createElement("div");
    createBtn.className = "np-playlist-item np-create-playlist";
    createBtn.innerHTML = '<span class="np-pl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span><span class="np-pl-name">新建歌单</span>';
    createBtn.addEventListener("click", function(){
      var name = prompt("请输入歌单名称：");
      if(name && name.trim()){
        name = name.trim();
        if(npCreatePlaylist(name)){
          nbsCurrentPlaylist = name;
          npBuildList();
          if(window.EC_SFX) EC_SFX.play("open");
        } else {
          alert("歌单已存在！");
        }
      }
    });
    box.appendChild(createBtn);
    
    // 所有歌单列表
    Object.keys(nbsPlaylists).forEach(function(plName){
      var count = nbsPlaylists[plName].length;
      var item = document.createElement("div");
      item.className = "np-playlist-item"+(nbsCurrentPlaylist === plName ? " on":"");
      item.innerHTML = '<span class="np-pl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span><span class="np-pl-name">'+plName+'</span><span class="np-pl-count">'+count+'首</span>';
      item.addEventListener("click", function(){
        nbsCurrentPlaylist = plName;
        npBuildList();
        if(window.EC_SFX) EC_SFX.play("click");
      });
      box.appendChild(item);
    });
    npSync();
    return;
  }
  
  // 歌单内页：顶部返回按钮
  if(nbsTab === "playlist" && nbsCurrentPlaylist){
    var backBtn = document.createElement("div");
    backBtn.className = "np-playlist-item np-back-btn";
    backBtn.innerHTML = '<span class="np-pl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></span><span class="np-pl-name">返回歌单列表（当前：'+nbsCurrentPlaylist+'）</span>';
    backBtn.addEventListener("click", function(){
      nbsCurrentPlaylist = "";
      npBuildList();
      if(window.EC_SFX) EC_SFX.play("back");
    });
    box.appendChild(backBtn);
  }

  var list = npFilteredList();
  
  if(list.length === 0){
    var empty = document.createElement("div");
    empty.className = "np-empty";
    empty.textContent = nbsTab === "fav" ? "还没有喜欢的歌曲，点爱心收藏吧" : (nbsSearchQ ? "没有找到相关歌曲" : "暂无歌曲");
    box.appendChild(empty);
    return;
  }
  
  list.forEach(function(p, displayIdx){
    // 通过title在完整playlist里找真实索引
    var realIdx = -1;
    for(var i = 0; i < allPlaylist.length; i++){
      if(allPlaylist[i].title === p.title){ realIdx = i; break; }
    }
    if(realIdx === -1) realIdx = displayIdx;
    
    var displayName = npGetDisplayName(p.title);
    var isFav = npIsInPlaylist(p.title, "喜欢");
    
    var d = document.createElement("div");
    d.className = "np-track"+(p.on?" on":"")+(isFav ? " fav":""); d.dataset.title = p.title;
    var cnName = SONG_TRANSLATIONS[p.title] || "";
    d.innerHTML = '<span class="nidx">'+(realIdx+1)+'</span>'+
      (isFav ? '<span class="fav-heart"><svg width="12" height="12" viewBox="0 0 24 24" fill="#ff5555" stroke="#ff5555"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>' : '')+
      '<span class="np-eq"><i></i><i></i><i></i></span>'+
      '<div class="nti"><b></b><i></i></div>'+
      '<span class="ndur">'+npFmt(p.dur)+'</span>'+
      '<button class="np-morebtn" title="更多操作"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>';
    d.querySelector("b").textContent = p.title;
    var iTag = d.querySelector(".nti i");
    if(cnName){
      iTag.textContent = cnName;
      iTag.style.display = "block";
    } else {
      iTag.style.display = "none";
    }
    d.addEventListener("click", function(e){
      if(e.target.closest && e.target.closest(".np-morebtn")){
        // 自定义操作菜单
        var mask = document.createElement("div");
        mask.className = "np-modal-mask";
        var isFavNow = npIsInPlaylist(p.title, "喜欢");
        mask.innerHTML = '<div class="np-modal">'+
          '<div class="np-modal-title">'+p.title+'</div>'+
          '<div class="np-modal-options">'+
            '<div class="np-modal-opt" data-act="fav">'+(isFavNow 
              ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> 取消喜欢'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> 喜欢')+
            '</div>'+
            '<div class="np-modal-opt" data-act="addpl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 添加到歌单</div>'+
            '<div class="np-modal-opt" data-act="dl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 下载歌曲</div>'+
            '<div class="np-modal-opt" data-act="eq"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.2" fill="var(--bg)"/><circle cx="15" cy="12" r="2.2" fill="var(--bg)"/><circle cx="7" cy="17" r="2.2" fill="var(--bg)"/></svg> 均衡器</div>'+
          '</div>'+
          '<div class="np-modal-cancel">取消</div>'+
        '</div>';
        document.body.appendChild(mask);
        
        function closeMask(){ mask.remove(); }
        mask.addEventListener("click", function(ev){
          if(ev.target === mask) closeMask();
          var opt = ev.target.closest(".np-modal-opt");
          if(ev.target.classList.contains("np-modal-cancel")){ closeMask(); return; }
          if(!opt) return;
          var act = opt.dataset.act;
          closeMask();
          if(act === "fav"){
            npToggleSongInPlaylist(p.title, "喜欢");
          } else if(act === "addpl"){
            // 歌单选择弹窗
            var plNames = Object.keys(nbsPlaylists);
            var plMask = document.createElement("div");
            plMask.className = "np-modal-mask";
            var plOpts = plNames.map(function(name, idx){
              return '<div class="np-modal-opt" data-pl="'+name+'">'+name+' <span style="color:#888;font-size:11px">('+nbsPlaylists[name].length+'首)</span></div>';
            }).join("");
            plMask.innerHTML = '<div class="np-modal">'+
              '<div class="np-modal-title">选择歌单</div>'+
              '<div class="np-modal-options">'+plOpts+'</div>'+
              '<div class="np-modal-cancel">取消</div>'+
            '</div>';
            document.body.appendChild(plMask);
            plMask.addEventListener("click", function(ev2){
              if(ev2.target === plMask || ev2.target.classList.contains("np-modal-cancel")){ plMask.remove(); return; }
              var plOpt = ev2.target.closest(".np-modal-opt");
              if(!plOpt) return;
              var plName = plOpt.dataset.pl;
              npToggleSongInPlaylist(p.title, plName);
              plMask.remove();
              if(window.EC_SFX) EC_SFX.play("click");
            });
          } else if(act === "dl"){
            fetch(BASE + allPlaylist[realIdx].file).then(function(r){return r.json();}).then(function(songData){
              var blob = new Blob([JSON.stringify(songData)], {type: 'application/json'});
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = p.title.replace(/[\\/:*?"<>|]/g, '_') + '.json';
              a.click();
              URL.revokeObjectURL(url);
            });
          } else if(act === "eq"){
            // 切换到这首歌，打开EQ面板
            if(p.title !== EC_NBS.title()) EC_NBS.select(realIdx);
            setTimeout(function(){
              // 先关闭所有其他面板
              document.querySelectorAll('.np-track-eqpanel.open').forEach(function(p){ p.classList.remove('open'); });
              var panel = document.querySelector('.np-track-eqpanel[data-title="'+p.title+'"]');
              if(panel){
                npEqOpenPanel(panel, p.title);
                panel.scrollIntoView({behavior:'smooth', block:'center'});
              }
            }, 200);
          }
          if(window.EC_SFX) EC_SFX.play("click");
        });
        return;
      }
      var t = EC_NBS.title();
      if(p.title === t){ EC_NBS.toggle(); } else { EC_NBS.select(realIdx); }
      setTimeout(function(){ npBuildList(); npSync(); }, 60);
    });
    box.appendChild(d);
    // 加回EQ面板
    var panel = document.createElement("div");
    panel.className = "np-track-eqpanel"; panel.dataset.title = p.title;
    box.appendChild(panel);
  });
  npSync();
}

/* 每曲均衡器逻辑 */
(function(){
  var EQ_LABELS = ["31","62","125","250","500","1k","2k","4k","6k","8k","12k","16k"];
  window.npEqPanelHTML = function(title){
    var rows = "";
    for(var i=0;i<12;i++){
      rows += '<span class="np-geq-freq">'+EQ_LABELS[i]+'</span>'+
              '<input type="range" class="np-geq-slider" data-band="'+i+'" min="-12" max="12" step="0.5" value="0"/>'+
              '<span class="np-geq-val" data-val="'+i+'">0</span>';
    }
    return '<div class="np-teq-head">'+
             '<span class="np-teq-title"></span>'+
             '<button class="np-teq-reset" data-act="reset">复位</button>'+
             '<button class="np-teq-close" data-act="close">收起</button>'+
           '</div>'+
           '<div class="np-eq-tplbar">'+
             '<button class="np-eq-tpl" data-tpl="1">模板1<span class="np-tpl-edit" data-edit="1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></span></button>'+
             '<button class="np-eq-tpl" data-tpl="2">模板2<span class="np-tpl-edit" data-edit="2"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></span></button>'+
             '<button class="np-eq-tpl" data-tpl="3">模板3<span class="np-tpl-edit" data-edit="3"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></span></button>'+
             '<button class="np-eq-tpl" data-tpl="4">模板4<span class="np-tpl-edit" data-edit="4"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></span></button>'+
           '</div>'+
           '<div class="np-geq">'+rows+'</div>';
  };
  window.npEqOpenPanel = function(panel, title){
    if(!window.EC_NBS || !window.EC_NBS.getEqFor) return;
    panel.innerHTML = window.npEqPanelHTML(title);
    panel.querySelector(".np-teq-title").textContent = title + " · 均衡器";
    panel.classList.add("open");
    var eq = window.EC_NBS.getEqFor(title);
    function fmt(v){ v=Number(v); return (v>0?"+":"")+(Math.round(v*10)/10); }
    panel.querySelectorAll(".np-geq-slider").forEach(function(s, i){
      s.value = eq[i];
      var t = panel.querySelector('[data-val="'+i+'"]');
      if(t){ t.textContent = fmt(eq[i]); t.classList.toggle("pos", eq[i]>0); }
    });
    // 滑块事件
    panel.querySelectorAll(".np-geq-slider").forEach(function(s){
      s.addEventListener("input", function(){
        var i = Number(this.dataset.band);
        var v = Number(this.value);
        var t = panel.querySelector('[data-val="'+i+'"]');
        if(t){ t.textContent = fmt(v); t.classList.toggle("pos", v>0); }
        var arr = [];
        panel.querySelectorAll(".np-geq-slider").forEach(function(ss){ arr.push(Number(ss.value)); });
        window.EC_NBS.setEqFor(title, arr);
      });
    });
    // 模板槽（对应当前歌曲，单选）
    var templates = JSON.parse(localStorage.getItem("EC_NBS_EQ_TEMPLATES")||"{}");
    var tplNames = JSON.parse(localStorage.getItem("EC_NBS_EQ_TPL_NAMES")||"{}");
    var tplActive = JSON.parse(localStorage.getItem("EC_NBS_EQ_TPL_ACTIVE")||"{}");
    var songKey = "eq_"+title;
    var tplBar = panel.querySelector(".np-eq-tplbar");
    for(var k=1;k<=4;k++){
      var btn = tplBar.querySelector('[data-tpl="'+k+'"]');
      var tplKey = songKey+"_tpl"+k;
      var editBtn = btn.querySelector(".np-tpl-edit");
      if(tplNames[tplKey]) btn.firstChild.textContent = tplNames[tplKey];
      // 高亮当前激活的模板
      if(tplActive[songKey] === k) btn.classList.add("active");
      (function(k, btn, tplKey){
        btn.addEventListener("click", function(e){
          if(e.target.closest(".np-tpl-edit")) return;
          e.stopPropagation();
          // 取消所有高亮
          tplBar.querySelectorAll(".np-eq-tpl").forEach(function(b){ b.classList.remove("active"); });
          if(templates[tplKey]){
            // 应用模板到当前歌曲
            window.EC_NBS.setEqFor(title, templates[tplKey]);
            panel.querySelectorAll(".np-geq-slider").forEach(function(s, i){
              s.value = templates[tplKey][i];
              var t = panel.querySelector('[data-val="'+i+'"]');
              if(t){ t.textContent = fmt(templates[tplKey][i]); t.classList.toggle("pos", templates[tplKey][i]>0); }
            });
            // 高亮当前
            btn.classList.add("active");
            tplActive[songKey] = k;
            localStorage.setItem("EC_NBS_EQ_TPL_ACTIVE", JSON.stringify(tplActive));
            if(window.EC_SFX) EC_SFX.play("click");
          } else {
            // 保存当前歌曲EQ到模板
            var arr = [];
            panel.querySelectorAll(".np-geq-slider").forEach(function(ss){ arr.push(Number(ss.value)); });
            templates[tplKey] = arr;
            localStorage.setItem("EC_NBS_EQ_TEMPLATES", JSON.stringify(templates));
            btn.classList.add("active");
            tplActive[songKey] = k;
            localStorage.setItem("EC_NBS_EQ_TPL_ACTIVE", JSON.stringify(tplActive));
            if(window.EC_SFX) EC_SFX.play("open");
          }
        });
        // 点铅笔改名
        editBtn.addEventListener("click", function(e){
          e.stopPropagation();
          var oldName = tplNames[tplKey] || ("模板"+k);
          var newName = prompt("输入模板名称：", oldName);
          if(newName && newName.trim()){
            tplNames[tplKey] = newName.trim();
            localStorage.setItem("EC_NBS_EQ_TPL_NAMES", JSON.stringify(tplNames));
            btn.firstChild.textContent = newName.trim();
          }
        });
      })(k, btn, tplKey);
    }
    // 复位/收起按钮
    panel.querySelector("[data-act='reset']").addEventListener("click", function(){
      var arr = new Array(12).fill(0);
      window.EC_NBS.setEqFor(title, arr);
      panel.querySelectorAll(".np-geq-slider").forEach(function(s, i){
        s.value = 0;
        var t = panel.querySelector('[data-val="'+i+'"]');
        if(t){ t.textContent = "0"; t.classList.remove("pos"); }
      });
    });
    panel.querySelector("[data-act='close']").addEventListener("click", function(){
      panel.classList.remove("open");
    });
  };
})();

/* 搜索框 */
(function(){
  var input = $("#npSearch");
  var clear = $("#npSearchClear");
  if(!input) return;
  input.addEventListener("input", function(){
    nbsSearchQ = this.value;
    clear.style.display = this.value ? "block" : "none";
    npBuildList();
  });
  clear.addEventListener("click", function(){
    input.value = "";
    nbsSearchQ = "";
    clear.style.display = "none";
    npBuildList();
    input.focus();
  });
})();

/* 标签切换 */
(function(){
  var tabs = document.querySelectorAll(".np-tab");
  tabs.forEach(function(tab){
    tab.addEventListener("click", function(){
      tabs.forEach(function(t){ t.classList.remove("on"); });
      this.classList.add("on");
      nbsTab = this.dataset.tab;
      if(nbsTab !== "playlist") nbsCurrentPlaylist = "";
      npBuildList();
      if(window.EC_SFX) EC_SFX.play("click");
    });
  });
})();
function openMusic(){
  $("#musicDrawer").classList.add("open");
  npBuildList();
  if(window.EC_SFX) EC_SFX.play("open");
}
$("#btnMusic").addEventListener("click", openMusic);
$("#mmMusic").addEventListener("click", openMusic);
$("#musicClose").addEventListener("click", function(){ $("#musicDrawer").classList.remove("open"); });
$("#musicMask").addEventListener("click", function(){ $("#musicDrawer").classList.remove("open"); });
$("#npPlay").addEventListener("click", function(){ if(window.EC_NBS) EC_NBS.toggle(); });
$("#npNext").addEventListener("click", function(){ if(window.EC_NBS){ EC_NBS.next(); setTimeout(function(){npBuildList();},80);} });
$("#npPrev").addEventListener("click", function(){ if(window.EC_NBS){ EC_NBS.prev(); setTimeout(function(){npBuildList();},80);} });
$("#npVol").addEventListener("input", function(){ if(window.EC_NBS) EC_NBS.setVol(this.value/100); });
/* 播放模式切换：顺序 → 单曲 → 随机 */
(function(){
  var btn = $("#npMode"); if(!btn) return;
  var txt = $("#npModeTxt");
  var ICONS = [
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>', /* 顺序 */
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="16" font-size="10" text-anchor="middle" fill="currentColor" font-weight="bold">1</text></svg>', /* 单曲 */
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.6 9.2L7.4 6H3v2h3.6l3.2 3.2.8-2zm6.8 9.8L14.2 16l.8-2 3.2 3H21v2h-3.6zM14 4h7v2h-4.4l-1.9 1.9-.8-2L16.6 4H14zM3 18h4.4l7-7 2.4-2.4L18.2 7H14V5h7v2"/></svg>' /* 随机 */
  ];
  var NAMES = ["顺序","单曲","随机"];
  var TITLES = ["顺序播放","单曲循环","随机播放"];
  function refresh(){
    var m = window.EC_NBS && EC_NBS.getLoop ? EC_NBS.getLoop() : 0;
    btn.innerHTML = ICONS[m]; btn.title = "播放模式：" + TITLES[m];
    btn.classList.toggle("on", m!==0);
    if(txt){ txt.textContent = NAMES[m]; txt.classList.toggle("on", m!==0); }
  }
  function cycle(){
    if(window.EC_NBS && EC_NBS.cycleLoop){ EC_NBS.cycleLoop(); if(window.EC_SFX) EC_SFX.play("click"); }
    refresh();
  }
  btn.addEventListener("click", cycle);
  if(txt){ txt.style.cursor="pointer"; txt.addEventListener("click", cycle); }
  var t = setInterval(function(){ if(window.EC_NBS && EC_NBS.getLoop){ refresh(); clearInterval(t); } }, 120);
  refresh();
})();
/* 自动保存音乐盒状态：当前歌、音量、增益、音质、风格 */
(function(){
  function saveState(){
    if(!window.EC_NBS) return;
    var st = {
      title: EC_NBS.title(),
      vol: EC_NBS.getVol ? EC_NBS.getVol() : 1,
      gain: parseFloat($("#npGain") ? $("#npGain").value : 0),
      quality: EC_NBS.getQuality ? EC_NBS.getQuality() : "44",
      style: EC_NBS.getStyle ? EC_NBS.getStyle() : "hifi",
      curTime: EC_NBS.cur ? EC_NBS.cur() : 0
    };
    localStorage.setItem("EC_NBS_STATE", JSON.stringify(st));
  }
  // 切歌、调音量、调增益、切音质风格时自动保存
  setInterval(saveState, 2000);
  window.addEventListener("beforeunload", saveState);
  // 启动时恢复状态
  var t = setInterval(function(){
    if(!window.EC_NBS){ return; }
    clearInterval(t);
    try{
      var st = JSON.parse(localStorage.getItem("EC_NBS_STATE")||"{}");
      if(st.title){
        var pl = EC_NBS.playlist();
        for(var i=0;i<pl.length;i++){
          if(pl[i].title === st.title){
            EC_NBS.select(i, false);
            // 恢复播放进度，等歌加载完再seek
            if(st.curTime && st.curTime > 1 && EC_NBS.seek){
              setTimeout(function(){
                var total = EC_NBS.dur ? EC_NBS.dur() : 0;
                if(total > 0) EC_NBS.seek(st.curTime / total);
              }, 600);
            }
            break;
          }
        }
      }
      if(st.vol!=null && EC_NBS.setVol) EC_NBS.setVol(st.vol);
      if(st.quality && EC_NBS.setQuality) EC_NBS.setQuality(st.quality);
      if(st.style && EC_NBS.setStyle) EC_NBS.setStyle(st.style);
      if(st.gain!=null && $("#npGain")){
        $("#npGain").value = st.gain;
        $("#npGainVal").textContent = (st.gain>0?"+":"")+st.gain;
        if(window.EC_NBS && EC_NBS.setGain) EC_NBS.setGain(st.gain);
      }
      npBuildList();
    }catch(e){ console.warn("恢复音乐状态失败", e); }
  }, 300);
})();
/* 播放风格切换 */
(function(){
  var seg = $("#npStyle"); if(!seg) return;
  function refresh(){
    var cur = window.EC_NBS ? EC_NBS.getStyle() : "hifi";
    seg.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on", b.dataset.style===cur); });
  }
  seg.querySelectorAll("button").forEach(function(b){
    b.addEventListener("click", function(){
      if(window.EC_NBS){ EC_NBS.setStyle(b.dataset.style); if(window.EC_SFX) EC_SFX.play("click"); }
      refresh();
    });
  });
  /* 引擎就绪后同步一次 */
  var t = setInterval(function(){ if(window.EC_NBS && EC_NBS.getStyle){ refresh(); clearInterval(t); } }, 120);
})();
/* 音质档位切换 */
(function(){
  var seg = $("#npQuality"); if(!seg) return;
  function refresh(){
    var cur = window.EC_NBS && EC_NBS.getQuality ? EC_NBS.getQuality() : "44";
    seg.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on", b.dataset.q===cur); });
  }
  seg.querySelectorAll("button").forEach(function(b){
    b.addEventListener("click", function(){
      if(window.EC_NBS){ EC_NBS.setQuality(b.dataset.q); if(window.EC_SFX) EC_SFX.play("click"); }
      refresh();
    });
  });
  var t = setInterval(function(){ if(window.EC_NBS && EC_NBS.getQuality){ refresh(); clearInterval(t); } }, 120);
})();
/* 频率响应曲线：HiFi = 当前调音曲线预设（入耳/头戴/音响，哈曼目标曲线形状）或用户 EQ；原版 = 平直 0dB；随预设/EQ/风格/切歌实时更新 */
(function(){
  var FRQ = [31,62,125,250,500,1000,2000,4000,6000,8000,12000,16000];
  var box = document.getElementById("npFreq");
  if(!box) return;
  var W=320, H=96, padL=10, padR=10, padT=8;
  var logMin=Math.log(31), logMax=Math.log(16000);
  function fx(f){ return padL + (Math.log(f)-logMin)/(logMax-logMin)*(W-padL-padR); }
  function fy(db){
    var y = H/2 - (db/12)*(H/2-padT);
    return Math.max(padT, Math.min(H-padT, y));
  }
  /* Catmull-Rom 样条 → 三次贝塞尔，曲线平滑不生硬（纯 SVG path，无 CSS 动画） */
  function smoothPath(pts){
    if(pts.length < 3) return "M" + pts.map(function(p){return p[0].toFixed(1)+","+p[1].toFixed(1);}).join(" L");
    var d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
    for(var i=0;i<pts.length-1;i++){
      var p0 = pts[i-1] || pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2] || p2;
      var c1x = p1[0] + (p2[0]-p0[0])/6, c1y = p1[1] + (p2[1]-p0[1])/6;
      var c2x = p2[0] - (p3[0]-p1[0])/6, c2y = p2[1] - (p3[1]-p1[1])/6;
      d += " C" + c1x.toFixed(1)+","+c1y.toFixed(1)+" "+c2x.toFixed(1)+","+c2y.toFixed(1)+" "+p2[0].toFixed(1)+","+p2[1].toFixed(1);
    }
    return d;
  }
  var PRESET_NAMES = { classic:"HiFi 经典", harman:"哈曼卡顿", moondrop:"水月雨", sony:"索尼" };
  function render(){
    var cur = window.EC_NBS && EC_NBS.getStyle ? EC_NBS.getStyle() : "hifi";
    var preset = window.EC_NBS && EC_NBS.getPreset ? EC_NBS.getPreset() : "iem";
    var title = window.EC_NBS && EC_NBS.title ? EC_NBS.title() : "";
    var eq = (window.EC_NBS && EC_NBS.getEqFor && title) ? EC_NBS.getEqFor(title) : [0,0,0,0,0,0,0,0,0,0,0,0];
    /* 用户没调过 → 显示当前调音曲线预设；调过 → 显示用户 EQ */
    var untouched = eq.every(function(v){ return v===0; });
    var curve = (window.EC_NBS && EC_NBS.getPresetCurve && untouched) ? EC_NBS.getPresetCurve() : eq;
    box.setAttribute("data-cur", cur);
    /* 原版干声直出不需要调音预设，隐藏按钮行；HiFi 下才显示 */
    var pbar = document.getElementById("npFreqPresets");
    if(pbar) pbar.style.display = (cur==="raw") ? "none" : "flex";
    var lbl = document.getElementById("npFreqLbl");
    if(lbl) lbl.textContent = (cur==="raw") ? "原版 NBS" : (PRESET_NAMES[preset] || "HiFi");
    document.querySelectorAll("#npFreqPresets button").forEach(function(b){
      b.classList.toggle("on", b.dataset.preset===preset);
    });
    var hifi = document.getElementById("npFreqHifi");
    var raw = document.getElementById("npFreqRaw");
    if(hifi){
      /* HiFi 曲线 = 预设 EQ + BOOST 1.35（+2.6dB 整体响度抬升，可视化用） */
      var pts = curve.map(function(db,i){ return [fx(FRQ[i]), fy(db+2.6)]; });
      hifi.setAttribute("d", smoothPath(pts));
    }
    if(raw){
      raw.setAttribute("d", "M"+fx(31).toFixed(1)+","+fy(0).toFixed(1)+" L"+fx(16000).toFixed(1)+","+fy(0).toFixed(1));
    }
    refreshQualityUI();
  }
  /* 调音曲线预设切换：点按钮立即试听，没在播就自动播 */
  var pbar = document.getElementById("npFreqPresets");
  if(pbar){
    pbar.addEventListener("click", function(e){
      var b = e.target.closest ? e.target.closest("button[data-preset]") : null;
      if(!b || !window.EC_NBS || !EC_NBS.setPreset) return;
      EC_NBS.setPreset(b.dataset.preset);
      if(window.EC_NBS && !EC_NBS.isPlaying && !EC_NBS.isPlaying()){
        if(EC_NBS.play) EC_NBS.play();
      }
      if(window.EC_SFX) EC_SFX.play("click");
    });
  }
  /* 音质档位切换：44 / 48 / 96 / 192（两处按钮同步） */
  ["npQuality","npQualityFreq"].forEach(function(id){
    var bar = document.getElementById(id);
    if(bar){
      bar.addEventListener("click", function(e){
        var b = e.target.closest ? e.target.closest("button[data-q]") : null;
        if(!b || !window.EC_NBS || !EC_NBS.setQuality) return;
        EC_NBS.setQuality(b.dataset.q);
        if(window.EC_NBS && !EC_NBS.isPlaying && !EC_NBS.isPlaying()){
          if(EC_NBS.play) EC_NBS.play();
        }
        if(window.EC_SFX) EC_SFX.play("click");
      });
    }
  });
  function refreshQualityUI(){
    if(!window.EC_NBS || !EC_NBS.getQuality) return;
    var q = EC_NBS.getQuality();
    document.querySelectorAll("#npQuality button, #npQualityFreq button").forEach(function(b){
      b.classList.toggle("on", b.dataset.q===q);
    });
    var info = EC_NBS.getQualityInfo ? EC_NBS.getQualityInfo() : null;
    var el = document.getElementById("npQInfo");
    if(el && info) el.textContent = info.sr+" · "+info.bit+" · "+info.kbps;
    var s = EC_NBS.getSpatial ? EC_NBS.getSpatial() : "off";
    document.querySelectorAll("#npSpatial button").forEach(function(b){
      b.classList.toggle("on", b.dataset.s===s);
    });
  }
  /* 空间环绕切换 */
  var sbar = document.getElementById("npSpatial");
  if(sbar){
    sbar.addEventListener("click", function(e){
      var b = e.target.closest ? e.target.closest("button[data-s]") : null;
      if(!b || !window.EC_NBS || !EC_NBS.setSpatial) return;
      EC_NBS.setSpatial(b.dataset.s);
      if(window.EC_NBS && !EC_NBS.isPlaying && !EC_NBS.isPlaying()){
        if(EC_NBS.play) EC_NBS.play();
      }
      if(window.EC_SFX) EC_SFX.play("click");
    });
  }
  render();
  var registered = false;
  var t2 = setInterval(function(){
    if(window.EC_NBS && EC_NBS.onChange){
      if(!registered){ EC_NBS.onChange(render); registered = true; }
      clearInterval(t2);
    }
  }, 200);
})();
/* 音量滑块同步 */
(function(){
  var v = document.getElementById("npVol");
  if(!v) return;
  function syncVol(){
    if(!window.EC_NBS || !EC_NBS.getVol) return;
    v.value = Math.round(EC_NBS.getVol()*100);
  }
  v.addEventListener("input", function(){
    if(window.EC_NBS) EC_NBS.setVol(Number(this.value)/100);
  });
  if(window.EC_NBS && EC_NBS.onChange) EC_NBS.onChange(syncVol);
  var t = setInterval(function(){ if(window.EC_NBS){ syncVol(); clearInterval(t); } },200);
})();
/* 音量增益：整体响度放大（0~+12dB），与均衡器独立 */
(function(){
  var g = document.getElementById("npGain"), gv = document.getElementById("npGainVal");
  if(!g) return;
  function fmtG(v){ v=Number(v); return (v>0?"+":"")+(Math.round(v*10)/10); }
  function syncGain(){
    if(!window.EC_NBS || !window.EC_NBS.getGain) return;
    var v = window.EC_NBS.getGain();
    g.value = v;
    if(gv){ gv.textContent = fmtG(v); gv.classList.toggle("pos", v>0); }
  }
  g.addEventListener("input", function(){
    if(!window.EC_NBS || !window.EC_NBS.setGain) return;
    window.EC_NBS.setGain(Number(this.value));
    if(gv){ gv.textContent = fmtG(this.value); gv.classList.toggle("pos", Number(this.value)>0); }
  });
  /* 引擎每次状态变化都同步（含启动恢复完成后），避免恢复晚于首次同步导致滑块显示 0 */
  if(window.EC_NBS && EC_NBS.onChange) EC_NBS.onChange(function(){ syncGain(); });
  var t = setInterval(function(){ if(window.EC_NBS){ syncGain(); clearInterval(t); } }, 200);
})();
/* 每曲均衡器：播放列表每条目右侧的 EQ 按钮展开 12 段下拉面板，各曲独立互不影响 */
(function(){
  var EQ_LABELS = ["31","62","125","250","500","1k","2k","4k","6k","8k","12k","16k"];
  function fmt(v){ v=Number(v); return (v>0?"+":"")+(Math.round(v*10)/10); }
  function panelHTML(title){
    var rows = "";
    for(var i=0;i<12;i++){
      rows += '<span class="np-geq-freq">'+EQ_LABELS[i]+'</span>'+
              '<input type="range" class="np-geq-slider" data-band="'+i+'" min="-12" max="12" step="0.5" value="0"/>'+
              '<span class="np-geq-val" data-val="'+i+'">0</span>';
    }
    return '<div class="np-teq-head">'+
             '<span class="np-teq-title"></span>'+
             '<button class="np-teq-reset" data-act="reset">复位</button>'+
             '<button class="np-teq-close" data-act="close">收起</button>'+
           '</div>'+
           '<div class="np-geq">'+rows+'</div>';
  }
  function openPanel(panel, title){
    if(!window.EC_NBS || !window.EC_NBS.getEqFor) return;
    panel.innerHTML = panelHTML(title);
    panel.querySelector(".np-teq-title").textContent = title + " · 均衡器";
    panel.classList.add("open");
    var eq = window.EC_NBS.getEqFor(title);
    panel.querySelectorAll(".np-geq-slider").forEach(function(s, i){
      s.value = eq[i];
      var t = panel.querySelector('[data-val="'+i+'"]');
      if(t){ t.textContent = fmt(eq[i]); t.classList.toggle("pos", eq[i]>0); }
    });
  }
  function collect(panel){
    var arr = [];
    panel.querySelectorAll(".np-geq-slider").forEach(function(s){ arr.push(Number(s.value)); });
    return arr;
  }
  /* 点击 EQ 按钮：展开/收起该曲下拉面板（事件委托，动态列表） */
  document.addEventListener("click", function(e){
    var btn = e.target.closest ? e.target.closest(".np-track-eqbtn") : null;
    if(btn){
      e.stopPropagation();
      var tr = btn.closest(".np-track");
      var panel = tr ? tr.nextElementSibling : null;
      if(panel && panel.classList && panel.classList.contains("np-track-eqpanel")){
        var isOpen = panel.classList.contains("open");
        document.querySelectorAll(".np-track-eqpanel.open").forEach(function(p){ p.classList.remove("open"); });
        if(!isOpen) openPanel(panel, tr.dataset.title);
      }
      return;
    }
    var act = e.target.closest ? e.target.closest("[data-act]") : null;
    if(act){
      var panel2 = act.closest(".np-track-eqpanel");
      if(!panel2) return;
      if(act.dataset.act === "close"){
        panel2.classList.remove("open");
        if(window.EC_SFX) window.EC_SFX.play("click");
      } else if(act.dataset.act === "reset"){
        var title2 = panel2.dataset.title;
        if(window.EC_NBS && window.EC_NBS.setEqFor){
          window.EC_NBS.setEqFor(title2, [0,0,0,0,0,0,0,0,0,0,0,0]);
          openPanel(panel2, title2);
          if(window.EC_SFX) window.EC_SFX.play("click");
        }
      }
      return;
    }
  });
  /* 滑块联动：编辑当前面板所属曲目的 EQ，非播放曲目只存设置 */
  document.addEventListener("input", function(e){
    var s = e.target;
    if(!s || !s.classList || !s.classList.contains("np-geq-slider")) return;
    var panel = s.closest(".np-track-eqpanel");
    if(!panel || !window.EC_NBS || !window.EC_NBS.setEqFor) return;
    var i = s.dataset.band;
    var t = panel.querySelector('[data-val="'+i+'"]');
    if(t){ t.textContent = fmt(s.value); t.classList.toggle("pos", Number(s.value)>0); }
    window.EC_NBS.setEqFor(panel.dataset.title, collect(panel));
  });
  /* 引擎状态变化（含启动恢复完成后）时刷新已打开面板的滑块值，与恢复的保存设置保持一致 */
  function syncOpenPanels(){
    if(!window.EC_NBS || !window.EC_NBS.getEqFor) return;
    document.querySelectorAll(".np-track-eqpanel.open").forEach(function(panel){
      var eq = window.EC_NBS.getEqFor(panel.dataset.title);
      panel.querySelectorAll(".np-geq-slider").forEach(function(s, i){
        s.value = eq[i];
        var t = panel.querySelector('[data-val="'+i+'"]');
        if(t){ t.textContent = fmt(eq[i]); t.classList.toggle("pos", eq[i]>0); }
      });
    });
  }
  if(window.EC_NBS && EC_NBS.onChange) EC_NBS.onChange(syncOpenPanels);
})();
/* 后台播放开关 */
(function(){
  var sw = $("#npBg"); if(!sw) return;
  sw.addEventListener("change", function(){
    if(window.EC_NBS && EC_NBS.setBg){ EC_NBS.setBg(sw.checked); if(window.EC_SFX) EC_SFX.play("click"); }
  });
  var t = setInterval(function(){
    if(window.EC_NBS && EC_NBS.getBg){ sw.checked = EC_NBS.getBg(); clearInterval(t); }
  }, 120);
})();
(function(){
  var bar = $("#npBar"), drag=false;
  function sk(e){ if(!window.EC_NBS) return;
    var r=bar.getBoundingClientRect();
    var x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
    EC_NBS.seek(Math.max(0,Math.min(1,x/r.width))); }
  bar.addEventListener("pointerdown", function(e){ drag=true; sk(e); if(bar.setPointerCapture)bar.setPointerCapture(e.pointerId); });
  bar.addEventListener("pointermove", function(e){ if(drag) sk(e); });
  bar.addEventListener("pointerup", function(){ drag=false; });
})();
/* 引擎状态变化时刷新 UI（含切歌） */
if(window.EC_NBS){ EC_NBS.onChange(function(){ npSync(); }); }

$("#mmReplay").addEventListener("click", function(){ $("#btnReplay").click(); });
$("#btnReplay").addEventListener("click", function(){
  opening.style.display="flex"; pResize();
  if(!LITE){ pRunning=true; }
  requestAnimationFrame(function(){ opening.classList.remove("leaving"); if(!LITE) pLoopRestart(); });
});
function pLoopRestart(){ (function l(){ if(!pRunning)return;
  pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
  for(var i=0;i<dots.length;i++){var d=dots[i];
    d.x+=d.vx;d.y+=d.vy;d.tw+=.02;
    if(d.x<-10)d.x=innerWidth+10;if(d.x>innerWidth+10)d.x=-10;
    if(d.y<-10)d.y=innerHeight+10;if(d.y>innerHeight+10)d.y=-10;
    pCtx.globalAlpha=d.a*(0.6+0.4*Math.sin(d.tw));pCtx.fillStyle="#ffca34";
    pCtx.beginPath();pCtx.arc(d.x,d.y,d.r,0,7);pCtx.fill();}
  requestAnimationFrame(l);})(); }
/* 添加到桌面 (PWA) */
var deferredPrompt = null;
addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); deferredPrompt = e; });
$("#btnDesktop").addEventListener("click", function(){
  if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt = null; return; }
  var ua = navigator.userAgent;
  var isQQ = /MQQBrowser|QQBrowser|TBS|MicroMessenger|TIM\//.test(ua);
  var isWeChat = /MicroMessenger/.test(ua);
  var isIOS = /iPhone|iPad|iPod/.test(ua);
  var msg;
  if(isWeChat)      msg = "微信不支持直接安装，请点右上角「···」→「在浏览器打开」后，再用浏览器菜单「添加到主屏幕」";
  else if(isQQ)     msg = "QQ 里请点右上角「☰」→「添加到主屏幕」；或选「用浏览器打开」后安装";
  else if(isIOS)    msg = "iOS 请点 Safari 底部分享按钮 →「添加到主屏幕」";
  else              msg = "请在浏览器菜单中选择「添加到主屏幕 / 安装应用」";
  toast(msg);
});
/* QQ/微信 X5 内核对 Service Worker 支持不稳，networkFirst 拦截 + 写缓存反而拖慢每次导航：
   流畅模式下不注册，并卸载老版本已注册的 SW、清掉其缓存；其它浏览器维持 PWA 离线能力 */
if(LITE){
  try{
    if("serviceWorker" in navigator){ navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }).catch(function(){}); }
    if(window.caches){ caches.keys().then(function(ks){ ks.forEach(function(k){ caches.delete(k); }); }).catch(function(){}); }
  }catch(e){}
}else if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js").catch(function(){}); }

/* ================= 通用工具 ================= */
function toast(msg){
  var t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(t._tm); t._tm = setTimeout(function(){t.classList.remove("show")}, 2200);
}
function copyText(txt, msg){
  var done = function(){ toast(msg || ("已复制 " + txt)); if(window.EC_SFX) EC_SFX.play("success"); };
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done, function(){fallback()}); }
  else fallback();
  function fallback(){ var ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select();
    try{document.execCommand("copy"); done();}catch(e){} document.body.removeChild(ta); }
}
function countUp(el, target, dur, suffix){
  suffix = suffix || "";
  var t0 = performance.now();
  requestAnimationFrame(function s(t){
    var p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
    el.textContent = Math.round(target*e) + suffix;
    if(p<1) requestAnimationFrame(s);
  });
}

/* ================= 数据装配 ================= */
var groups = [];
D.official.forEach(function(g,i){ groups.push(Object.assign({cat:"official",seq:i+1},g)); });
D.player.forEach(function(g,i){ groups.push(Object.assign({cat:"player",seq:i+1},g)); });
var activeGroups = groups.filter(function(g){return !g.defunct});
var memCache = {};        // id -> {count,max,name,ts}
var memState = {};        // id -> "pending"|"loading"|"done"|"fail"
var totalMembers = 0, loadedCnt = 0;

$("#heroGroups").textContent = groups.length;
$("#heroChannels").textContent = D.channels.length;
$("#headDate").textContent = "统计日期 " + D.updated;
$("#ratioDate").textContent = D.updated;
$("#footUpdated").textContent = "最近统计时间 " + D.updated;

/* ================= 统计卡 /  donut ================= */
var revealed = false;
function revealAll(){
  if(revealed) return; revealed = true;
  countUp($("#stGroups"), activeGroups.length, 900);
  countUp($("#stMale"), D.summary.withoutUnknown.male, 900, "%");
  countUp($("#stFemale"), D.summary.withoutUnknown.female, 900, "%");
  drawDonut();
  renderRank();
  observeRows();
}
function drawDonut(){
  var m=D.summary.withUnknown.male, f=D.summary.withUnknown.female, u=100-m-f;
  var C=2*Math.PI*66, gap=0;
  var mL=C*m/100, fL=C*f/100, uL=C*u/100;
  var arcM=$("#arcM"), arcF=$("#arcF"), arcU=$("#arcU");
  arcF.setAttribute("transform","rotate("+(m*3.6)+" 84 84)");
  arcU.setAttribute("transform","rotate("+((m+f)*3.6)+" 84 84)");
  [arcM,arcF,arcU].forEach(function(a){ a.style.transition="stroke-dasharray 1.2s cubic-bezier(.22,1,.36,1)"; });
  requestAnimationFrame(function(){
    arcM.setAttribute("stroke-dasharray", Math.max(mL-gap,0)+" "+C);
    arcF.setAttribute("stroke-dasharray", Math.max(fL-gap,0)+" "+C);
    arcU.setAttribute("stroke-dasharray", Math.max(uL-gap,0)+" "+C);
  });
  countUp($("#donutMain"), m, 1000, "%");
  $("#lgM").textContent = m+"%"; $("#lgF").textContent = f+"%"; $("#lgU").textContent = u+"%";
  $("#lgSub").textContent = "以上为含未知口径；未知性别去掉后：男 " + D.summary.withoutUnknown.male + "% · 女 " + D.summary.withoutUnknown.female + "%";
}

/* ================= 排行榜 ================= */
var rankMode = "male", rankExpanded = false;
$("#tabM").classList.add("sel");
$("#tabM").addEventListener("click", function(){ rankMode="male"; rankExpanded=false; syncRankTabs(); renderRank(); });
$("#tabF").addEventListener("click", function(){ rankMode="female"; rankExpanded=false; syncRankTabs(); renderRank(); });
$("#rankMore").addEventListener("click", function(){ rankExpanded=!rankExpanded; renderRank(); });
function syncRankTabs(){ $("#tabM").classList.toggle("sel",rankMode==="male"); $("#tabF").classList.toggle("sel",rankMode==="female"); }
function renderRank(){
  var key = rankMode, color = key==="male" ? "var(--male)" : "var(--female)";
  var list = activeGroups.filter(function(g){return typeof g[key]==="number"})
    .sort(function(a,b){return b[key]-a[key]});
  var show = rankExpanded ? list : list.slice(0,10);
  var box = $("#rankList"); box.innerHTML = "";
  show.forEach(function(g,i){
    var row = document.createElement("div"); row.className="rk-row";
    row.style.transitionDelay = Math.min(i*45,500)+"ms";
    row.innerHTML = '<span class="rk-i'+(i<3?" top":"")+'">'+(i+1)+'</span>'+
      '<span class="rk-name" title=""></span>'+
      '<span class="rk-bar"><i style="background:'+color+'"></i></span>'+
      '<span class="rk-v">'+g[key]+'%</span>';
    row.querySelector(".rk-name").textContent = g.name;
    row.querySelector(".rk-name").title = g.name;
    box.appendChild(row);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      row.classList.add("in");
      row.querySelector(".rk-bar i").style.width = g[key]+"%";
    });});
  });
  $("#rankMore").textContent = rankExpanded ? "收起 ↑" : ("展开全部 " + list.length + " 个 ↓");
  $("#rankMore").style.display = list.length>10 ? "" : "none";
}

/* ================= 实时人数（接口 + 缓存 + 懒加载） ================= */
var CACHE_KEY = "ec_member_cache_v1", CACHE_TTL = 30*60*1000;
try{ memCache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; }catch(e){ memCache = {}; }
var fetchQueue = [], fetching = 0, MAX_PAR = 8;
var hasKey = !!(window.EC_DATA && window.EC_DATA.uapiKey);
if(hasKey){ MAX_PAR = 2; } /* 带 key 走稳定模式，避免触发接口 QPS 限流 */

function fetchGroup(id, onDone){
  var c = memCache[id];
  if(c && Date.now()-c.ts < CACHE_TTL){ onDone(null, c); return; }
  fetchQueue.push({id:id, cb:onDone}); pump();
}
/* 预热加载完成后，把数据写回对应行 */
function updateRowIfVisible(id){
  var tr = tbody.querySelector('tr[data-gid="'+id+'"]');
  if(tr && memCache[id]){
    var cell = tr.querySelector(".g-mem");
    if(cell && cell.querySelector(".skl")){
      cell.innerHTML = '';
      var s = document.createElement("span"); cell.appendChild(s);
      countUp(s, memCache[id].count, 500);
      var mx = document.createElement("span"); mx.className="max"; mx.textContent=" / "+memCache[id].max; cell.appendChild(mx);
    }
    var join = tr.querySelector("[data-join]");
    if(join && memCache[id].join) join.href = memCache[id].join;
  }
}
function pump(){
  while(fetching < MAX_PAR && fetchQueue.length){
    var job = fetchQueue.shift(); fetching++;
    var id = job.id, cb = job.cb;
    queryGroup(id).then(function(data){
      memCache[id] = {count:data.member_count, max:data.max_member_count, name:data.group_name, join:data.join_url, ts:Date.now()};
      try{ localStorage.setItem(CACHE_KEY, JSON.stringify(memCache)); }catch(e){}
      fetching--;
      if(hasKey){ setTimeout(pump, 700); } else { pump(); }
      cb(null, memCache[id]); bumpTotal();
    }).catch(function(err){
      fetching--;
      if(hasKey){ setTimeout(pump, 700); } else { pump(); }
      if(err && err.rateLimit){
        // 触发限流：停止后续请求，避免把当日额度耗尽
        if(!rateLimited){ rateLimited = true; fetchQueue.length = 0; onRateLimit(); }
      }
      cb(err || new Error("fail"));
    });
  }
}
function queryGroup(id){
  var key = (window.EC_DATA && window.EC_DATA.uapiKey) || "";
  var sep = key ? "?apikey=" + encodeURIComponent(key) + "&" : "?";
  var url = "/api/group/" + id + sep;
  return timedFetch(url).then(function(r){
    if(r.status === 429){ var e = new Error("ratelimit"); e.rateLimit = true; throw e; }
    if(!r.ok) throw new Error("http"); return r.json();
  });
}
var rateLimited = false;
function onRateLimit(){
  var lbl = document.querySelector(".stat.c-live .lbl");
  if(lbl) lbl.textContent = "人数接口已达当日限额";
  toast("人数接口已达今日限额，明天自动恢复；填 API Key 可解除（见 data.js）");
}
function timedFetch(url){
  return Promise.race([
    fetch(url),
    new Promise(function(_,rej){ setTimeout(function(){rej(new Error("timeout"))}, 9000); })
  ]);
}
function bumpTotal(){
  var sum = 0, n = 0;
  Object.keys(memCache).forEach(function(k){ if(memCache[k] && typeof memCache[k].count==="number"){ sum+=memCache[k].count; n++; } });
  totalMembers = sum; loadedCnt = n;
  var el = $("#stMembers");
  if(snapshotReady) return;   /* 快照已接管显示，实时查询不再覆盖总人数 */
  el.style.visibility = "visible";
  el.textContent = sum.toLocaleString();
  var lbl = $("#liveLbl");
  if(!lbl) return;
  if(snapshotReady){
    lbl.textContent = "社群总人数 · 点击查看趋势";
  }else{
    lbl.textContent = "社群总人数 · 点击查看趋势" + (n < activeGroups.length ? " · 已统计 "+n+"/"+activeGroups.length : "");
  }
}
/* ================= 人数全景（卡片迷你曲线 + 可缩放群趋势图） ================= */
function esc(s){ var d=document.createElement("div"); d.textContent=s; return d.innerHTML; }
var pulseState = { viewStart: 0, viewEnd: 0, sel: null, pts: [], zoom: 1 };
function renderPulse(pts){
  pulseState.pts = pts;
  var cutoff = Date.now() - 40*864e5;   /* 与采样库保留期一致：默认显示从起始到现在 */
  /* 只统计带各群人数（g 非空）的点——纯 EC 在线人数采样点（仅 ec 字段）不参与本图 */
  var recent = pts.filter(function(p){ return p.ts >= cutoff && Object.keys(p.g||{}).length > 0; });
  if(recent.length < 2) recent = pts.filter(function(p){ return Object.keys(p.g||{}).length > 0; });
  /* 推断每个采样点完整度：新数据自带 c 字段；老数据用"群数占比"推断，接口故障漏群的点标记为不完整 */
  var expN = 0;
  recent.forEach(function(p){
    if(typeof p.t === "number" && p.t > expN) expN = p.t;
    var gn = Object.keys(p.g||{}).length;
    if(gn > expN) expN = gn;
  });
  recent.forEach(function(p){
    p._inc = (typeof p.c === "number") ? p.c < 0.9
           : (expN > 0 && Object.keys(p.g||{}).length < expN*0.9);
  });
  /* 缺失群回填：接口故障期漏掉的群用相邻采样点的同群人数补齐（前向沿用+开头段后向回填），
     否则"群查回来了"会被算成假性暴涨，总人数曲线出现上千人的假跳变 */
  var allIds = {};
  recent.forEach(function(p){ Object.keys(p.g||{}).forEach(function(k){ allIds[k]=1; }); });
  recent.forEach(function(p){ p.gf = {}; });
  Object.keys(allIds).forEach(function(id){
    var last = null;
    recent.forEach(function(p){
      if(p.g && typeof p.g[id]==="number"){ last = p.g[id]; p.gf[id]=last; }
      else if(last!==null){ p.gf[id]=last; }
    });
    var nxt = null;
    for(var ri=recent.length-1; ri>=0; ri--){
      var rp = recent[ri];
      if(typeof rp.gf[id]==="number"){ nxt = rp.gf[id]; }
      else if(nxt!==null){ rp.gf[id]=nxt; }
    }
  });
  pulseState.recent = recent;
  pulseState.viewStart = 0;
  pulseState.viewEnd = recent.length ? recent[recent.length-1].ts - recent[0].ts : 1;
  pulseState.zoom = 1;
  pulseState.sel = null;

  /* ① 卡片迷你曲线：总人数走向（跳过不完整的数据点） */
  var tp = recent.filter(function(p){
    return !p._inc;  /* 完整度 >= 90% 才纳入曲线 */
  }).map(function(p){
    var t = 0; Object.keys(p.g||{}).forEach(function(k){ t += p.g[k]; });
    return [p.ts, t];
  });
  var sc = $("#totalSpark");
  if(sc && tp.length > 1){
    var sctx = sc.getContext("2d"), dpr = devicePixelRatio||1;
    var W = sc.clientWidth||96, H = sc.clientHeight||34;
    sc.width = W*dpr; sc.height = H*dpr; sctx.scale(dpr,dpr);
    var vals = tp.map(function(p){return p[1]});
    var mx = Math.max.apply(null,vals), mn = Math.min.apply(null,vals);
    if(mx===mn){ mx+=1; }
    sctx.beginPath();
    tp.forEach(function(p,i){
      var x = 2+(W-4)*i/(tp.length-1), y = (H-3) - ((p[1]-mn)/(mx-mn))*(H-6);
      i ? sctx.lineTo(x,y) : sctx.moveTo(x,y);
    });
    var up = vals[vals.length-1] >= vals[0];
    sctx.strokeStyle = up ? "#6fbf73" : "#e06c7d";
    sctx.lineWidth = 1.6; sctx.stroke();
    sctx.lineTo(W-2,H-1); sctx.lineTo(2,H-1); sctx.closePath();
    sctx.fillStyle = up ? "rgba(111,191,115,.10)" : "rgba(224,108,125,.10)";
    sctx.fill();
  }

  /* ② 群选择器 */
  buildGroupSelector(recent);
  drawPulseChart();
}

function buildGroupSelector(recent){
  var box = $("#gsel");
  if(!box) return;
  /* 统计各群最新人数与区间变化 */
  var latest = recent.length ? recent[recent.length-1].g||{} : {};
  var first  = recent.length ? recent[0].g||{} : {};
  var list = Object.keys(latest).map(function(id){
    var hadFirst = id in first;
    var fc = hadFirst ? first[id] : null;
    return {
      id: id,
      count: latest[id]||0,
      delta: hadFirst ? (latest[id]||0) - fc : null,  /* null = 新出现/数据恢复，不算增长 */
      isNew: !hadFirst
    };
  }).sort(function(a,b){ return b.count-a.count; });

  var nameOf2 = {};
  groups.forEach(function(g){ if(g.id) nameOf2[g.id] = g.name; });

  box.innerHTML = "";
  var allBtn = document.createElement("button");
  allBtn.className = "all-btn on";
  allBtn.textContent = "全部概览";
  allBtn.addEventListener("click", function(){
    pulseState.sel = null;
    box.querySelectorAll("button").forEach(function(b){ b.classList.remove("on"); });
    allBtn.classList.add("on");
    if(window.EC_SFX) EC_SFX.play("click");
    drawPulseChart();
  });
  box.appendChild(allBtn);

  list.forEach(function(g){
    var b = document.createElement("button");
    var arrow = g.isNew ? '<span style="color:var(--ink-3);font-size:10px">新</span>'
              : g.delta>0 ? '<span style="color:var(--male)">↑'+g.delta+'</span>'
              : g.delta<0 ? '<span style="color:var(--female)">↓'+(-g.delta)+'</span>' : '';
    b.innerHTML = esc(nameOf2[g.id]||("群 "+g.id)) + ' <span class="n">' + g.count.toLocaleString() + '</span> ' + arrow;
    b.dataset.gid = g.id;
    b.addEventListener("click", function(){
      if(pulseState.sel === g.id){
        pulseState.sel = null;
        box.querySelectorAll("button").forEach(function(x){ x.classList.remove("on"); });
        allBtn.classList.add("on");
      }else{
        pulseState.sel = g.id;
        box.querySelectorAll("button").forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
      }
      if(window.EC_SFX) EC_SFX.play("click");
      drawPulseChart();
    });
    box.appendChild(b);
  });
}

function drawPulseChart(){
  var svg = document.getElementById("pulseSvg");
  if(!svg) return;
  var wrap = document.getElementById("pulseSvgWrap");
  /* 部分移动端（尤其 QQ X5 内核）DOMContentLoaded 阶段布局未完成，clientWidth 为 0；
     用 getBoundingClientRect + 父元素 + innerWidth 逐级兜底 */
  var W = (wrap && (wrap.clientWidth || wrap.getBoundingClientRect().width))
       || (wrap && wrap.parentElement && wrap.parentElement.clientWidth)
       || (window.innerWidth - 52) || 300;
  W = Math.max(Math.floor(W), 200);
  var H = 340;
  if(window.innerWidth <= 860) H = 260;
  svg.setAttribute("width", W);           /* 显式写宽，避免 100% 宽度在 X5 下解析为 0 */
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);  /* 视口锁定，保证任何内核下坐标系一致 */
  svg.setAttribute("height", H);
  var NS = "http://www.w3.org/2000/svg";
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  function el(tag, attrs){
    var e = document.createElementNS(NS, tag);
    for(var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  var recent = pulseState.recent || [];
  if(!recent.length){
    var t0 = el("text",{x:W/2, y:H/2, "text-anchor":"middle", fill:"#5a5448", "font-size":13});
    t0.textContent = "数据攒集中——每 6 小时采样一次，满两个采样点后出图";
    svg.appendChild(t0); return;
  }
  var pad = {l:26, r:60, t:14, b:30};
  var x0=pad.l, x1=W-pad.r, y0=H-pad.b, y1=pad.t;
  var fullT0 = recent[0].ts, fullT1 = recent[recent.length-1].ts;
  var span = Math.max(fullT1-fullT0, 1);
  var vT0 = fullT0 + span * pulseState.viewStart;
  var vT1 = fullT0 + span * Math.min(pulseState.viewStart + 1/pulseState.zoom, 1);
  if(vT1===vT0) vT1 = vT0+1;
  function X(ts){ return x0 + (x1-x0)*(ts-vT0)/(vT1-vT0); }

  var visPts = recent.filter(function(p){ return p.ts>=vT0 && p.ts<=vT1; });
  /* 缩放/平移后窗口内可能没有采样点：向两侧各扩一个点（空隙中取前后最近点），
     保证折线连续穿过窗口，数据时间轴不出现空白断档 */
  var extPts = visPts;
  if(recent.length){
    var i0=-1, i1=-1;
    for(var vi=0; vi<recent.length; vi++){
      if(recent[vi].ts>=vT0 && recent[vi].ts<=vT1){ if(i0<0) i0=vi; i1=vi; }
    }
    if(i0<0){
      var b0=-1, b1=-1;
      for(var vj=0; vj<recent.length; vj++){
        if(recent[vj].ts<vT0) b0=vj;
        if(recent[vj].ts>vT1 && b1<0) b1=vj;
      }
      extPts=[];
      if(b0>=0) extPts.push(recent[b0]);
      if(b1>=0) extPts.push(recent[b1]);
    }else{
      extPts = recent.slice(Math.max(0,i0-1), Math.min(recent.length-1,i1+1)+1);
    }
  }
  if(!extPts.length) extPts = recent;
  /* 标记不完整的数据点（采样时接口故障导致群数缺失） */
  var incomplete = visPts.filter(function(p){ return p._inc; }).length;

  var series = {};
  extPts.forEach(function(p){
    var gm = p.gf || p.g || {};
    Object.keys(gm).forEach(function(id){
      if(!series[id]) series[id] = [];
      series[id].push({ts:p.ts, count:gm[id]});
    });
  });
  var ids = Object.keys(series);
  var nameOf2 = {};
  groups.forEach(function(g){ if(g.id) nameOf2[g.id] = g.name; });

  var totalArr = extPts.map(function(p){
    var gm = p.gf || p.g || {}, t=0;
    Object.keys(gm).forEach(function(k){ t+=gm[k]; });
    return {ts:p.ts, count:t, inc:!!p._inc};
  });
  var gmax = 1, gmin = 0;
  ids.forEach(function(id){ series[id].forEach(function(s){ if(s.count>gmax) gmax=s.count; }); });
  totalArr.forEach(function(s){ if(s.count>gmax) gmax=s.count; });
  var selArr = pulseState.sel ? (series[pulseState.sel]||[]) : [];
  if(selArr.length){
    var smax=1, smin=1e18;
    selArr.forEach(function(s){ if(s.count>smax)smax=s.count; if(s.count<smin)smin=s.count; });
    var padY = Math.max((smax-smin)*0.1, 1);
    gmax = smax + padY; gmin = Math.max(0, smin - padY);
  }
  if(gmax===gmin) gmax+=1;
  function Y(c){ return y0 - ((c-gmin)/(gmax-gmin))*(y0-y1); }

  /* 网格 */
  for(var gi=0; gi<=4; gi++){
    var gy = y0-(y0-y1)*gi/4;
    svg.appendChild(el("line",{x1:x0,y1:gy,x2:x1,y2:gy,stroke:"rgba(255,255,255,.06)","stroke-width":1}));
    var lt = el("text",{x:22, y:gy+3, fill:"#5a5448", "font-size":10});
    lt.textContent = Math.round(gmin+(gmax-gmin)*gi/4);
    svg.appendChild(lt);
  }
  /* X 轴时间刻度：按时间均匀分布，不受采样点稀疏/密集影响；
     刻度对齐到本地 0/6/12/18 点等整点（而非 UTC 对齐），与 6 小时采样节奏一致 */
  var tSteps = [6e4, 3e5, 6e5, 9e5, 18e5, 36e5, 72e5, 108e5, 216e5, 432e5, 864e5, 2592e5, 6048e5];   /* 1分~7天 */
  var maxLab = Math.max(3, Math.floor((x1-x0)/64));
  var tStep = tSteps[tSteps.length-1];
  for(var si=0; si<tSteps.length; si++){
    if((vT1-vT0)/tSteps[si] <= maxLab){ tStep = tSteps[si]; break; }
  }
  var tzOff = new Date().getTimezoneOffset()*60000;   /* UTC+8 为 -28800000：让刻度落在本地整点 */
  var multiDay = new Date(vT0).toDateString() !== new Date(vT1).toDateString();
  for(var tt=Math.ceil((vT0-tzOff)/tStep)*tStep+tzOff; tt<=vT1; tt+=tStep){
    var d = new Date(tt);
    var s;
    if(tStep < 36e5){ s = (d.getHours()<10?"0":"")+d.getHours()+":"+(d.getMinutes()<10?"0":"")+d.getMinutes(); }
    else if(tStep >= 864e5){ s = (d.getMonth()+1)+"/"+d.getDate(); }
    else{
      s = (d.getHours()<10?"0":"")+d.getHours()+":00";
      if(multiDay && d.getHours()===0) s = (d.getMonth()+1)+"/"+d.getDate()+" "+s;  /* 跨天时 0 点带日期 */
    }
    var tx = X(tt);
    var anchor = tx < x0+16 ? "start" : tx > x1-16 ? "end" : "middle";
    var xt = el("text",{x:tx, y:H-8, fill:"#5a5448", "font-size":10, "text-anchor":anchor});
    xt.textContent = s;
    svg.appendChild(xt);
  }

  /* 数据裁剪区：缩放/平移后扩展点画在图区外，统一裁剪，不得盖住坐标轴 */
  var defs = el("defs",{});
  var cpEl = el("clipPath",{id:"pulseClip"});
  cpEl.appendChild(el("rect",{x:x0, y:y1, width:(x1-x0), height:(y0-y1)}));
  defs.appendChild(cpEl); svg.appendChild(defs);
  var gClip = el("g",{"clip-path":"url(#pulseClip)"}); svg.appendChild(gClip);

  /* 背景：其余群淡灰线 */
  var bgAlpha = pulseState.sel ? ".07" : ".15";
  ids.forEach(function(id){
    if(pulseState.sel && id===pulseState.sel) return;
    var path = "";
    series[id].forEach(function(s,i){
      path += (i?"L":"M") + X(s.ts).toFixed(1) + " " + Y(s.count).toFixed(1);
    });
    if(path) gClip.appendChild(el("path",{d:path, fill:"none", stroke:"rgba(138,133,120,"+bgAlpha+")", "stroke-width":1}));
  });

  /* 总人数曲线（金色）：单独一套刻度（右侧刻度列），几十人的波动也能看清 */
  if(!pulseState.sel && totalArr.length > 1){
    /* 只按完整点定刻度，漏群的虚线段越界就截到图内 */
    var tVals = totalArr.filter(function(s){ return !s.inc; }).map(function(s){ return s.count; });
    if(!tVals.length) tVals = totalArr.map(function(s){ return s.count; });
    var tMax = Math.max.apply(null,tVals), tMin = Math.min.apply(null,tVals);
    var tPadY = Math.max((tMax-tMin)*0.12, 3);
    tMax += tPadY; tMin = Math.max(0, tMin - tPadY);
    if(tMax===tMin) tMax+=1;
    function YT(c){ return y0 - ((c-tMin)/(tMax-tMin))*(y0-y1); }
    function YTc(c){ return Math.max(y1, Math.min(y0, YT(c))); }  /* 截断到图区 */

    var tSolid = "", tDash = "";
    for(var si=1; si<totalArr.length; si++){
      var ta = totalArr[si-1], tb = totalArr[si];
      var seg = "M"+X(ta.ts).toFixed(1)+" "+YTc(ta.count).toFixed(1)
              + "L"+X(tb.ts).toFixed(1)+" "+YTc(tb.count).toFixed(1);
      if(ta.inc || tb.inc){ tDash += seg; } else { tSolid += seg; }
    }
    if(tDash) gClip.appendChild(el("path",{d:tDash, fill:"none", stroke:"rgba(255,202,52,.35)", "stroke-width":2, "stroke-dasharray":"5 5", "stroke-linecap":"round"}));
    if(tSolid) gClip.appendChild(el("path",{d:tSolid, fill:"none", stroke:"#ffca34", "stroke-width":2.2}));
    totalArr.forEach(function(s){
      if(!s.inc) return;
      gClip.appendChild(el("circle",{cx:X(s.ts), cy:YTc(s.count), r:3.4, fill:"#171c26", stroke:"rgba(255,202,52,.6)", "stroke-width":1.5}));
    });
    var lastT = totalArr[totalArr.length-1];
    if(!lastT.inc) gClip.appendChild(el("circle",{cx:X(lastT.ts), cy:YTc(lastT.count), r:3.6, fill:"#ffca34"}));

    /* 右侧总人数刻度列（金色小字） */
    for(var tg=0; tg<=4; tg++){
      var tv = Math.round(tMin+(tMax-tMin)*tg/4);
      var ty = y0-(y0-y1)*tg/4;
      var rt = el("text",{x:x1+6, y:ty+3, fill:"rgba(255,202,52,.55)", "font-size":10});
      rt.textContent = tv.toLocaleString();
      svg.appendChild(rt);
    }
  }

  /* 选中群：分段着色折线 */
  if(pulseState.sel && selArr.length){
    for(var i=1; i<selArr.length; i++){
      var a=selArr[i-1], b=selArr[i];
      var col = b.count>a.count ? "#6fbf73" : b.count<a.count ? "#e06c7d" : "#8a8578";
      gClip.appendChild(el("line",{
        x1:X(a.ts), y1:Y(a.count), x2:X(b.ts), y2:Y(b.count),
        stroke:col, "stroke-width":2.4
      }));
    }
    selArr.forEach(function(s,i){
      var prev = i>0 ? selArr[i-1].count : null;
      var d = prev===null ? 0 : s.count-prev;
      var col = d>0 ? "#6fbf73" : d<0 ? "#e06c7d" : "#8a8578";
      gClip.appendChild(el("circle",{cx:X(s.ts), cy:Y(s.count), r:3.2, fill:col}));
    });
  }

  /* hover 层：透明圆点供触发 */
  var hitData = [];
  function addHit(x, y, name, count, delta, ts){
    var c = el("circle",{cx:x, cy:y, r:12, fill:"transparent", style:"cursor:pointer"});
    c.addEventListener("mouseenter", function(e){
      var tip = $("#pulseTip");
      var timeStr = ts ? new Date(ts).toLocaleString("zh-CN",{hour:"2-digit",minute:"2-digit"})+" " : "";
      var dstr = delta>0 ? '<b style="color:var(--male)">+'+delta+'</b>'
               : delta<0 ? '<b style="color:var(--female)">'+delta+'</b>' : '<b>±0</b>';
      tip.innerHTML = name+' · '+timeStr+'<b>'+count.toLocaleString()+'</b> 人 · 较上小时 '+dstr;
      tip.style.display="block";
      var tw=tip.offsetWidth;
      tip.style.left=Math.min(Math.max(4,x-tw/2),W-tw-4)+"px";
      tip.style.top=Math.max(4,y-52)+"px";
    });
    c.addEventListener("mouseleave", function(){ $("#pulseTip").style.display="none"; });
    svg.appendChild(c);
  }
  if(!pulseState.sel && totalArr.length){
    /* 只给窗口内的最后一个点挂 hover（扩展点在图区外，不挂） */
    var lt = null, ltIdx = -1;
    for(var hi2=totalArr.length-1; hi2>=0; hi2--){
      if(totalArr[hi2].ts>=vT0 && totalArr[hi2].ts<=vT1){ lt=totalArr[hi2]; ltIdx=hi2; break; }
    }
    if(lt){
      var ltY = (typeof YTc==="function") ? YTc(lt.count) : Y(lt.count);
      addHit(X(lt.ts), ltY, "社群总人数", lt.count,
        ltIdx>0 ? lt.count-totalArr[0].count : 0, null);
    }
  }
  if(pulseState.sel && selArr.length){
    selArr.forEach(function(s,i){
      if(s.ts<vT0 || s.ts>vT1) return;   /* 窗口外的扩展点不挂 hover */
      var prev = i>0 ? selArr[i-1].count : null;
      addHit(X(s.ts), Y(s.count), nameOf2[pulseState.sel]||("群 "+pulseState.sel),
        s.count, prev===null?0:s.count-prev, s.ts);
    });
  }

  var zInfo = $("#zoomInfo");
  if(zInfo){
    var hours = Math.round((vT1-vT0)/36e5*10)/10;
    if(pulseState.zoom > 1 || pulseState.viewStart > 0){
      var zf=function(ts){ var d=new Date(ts); return (d.getMonth()+1)+"/"+d.getDate()+" "+(d.getHours()<10?"0":"")+d.getHours()+":"+(d.getMinutes()<10?"0":"")+d.getMinutes(); };
      zInfo.textContent = zf(vT0)+" ~ "+zf(vT1);
    }else{
      var zh = hours >= 24 ? Math.round(hours/24*10)/10+" 天" : hours+" 小时";
      zInfo.textContent = "显示全部（近 "+zh+"）";
    }
  }
  var hint = $("#pulseHint");
  if(hint){
    var warn = incomplete > 0 ? " · ⚠️ "+incomplete+" 个采样点不完整（虚线段为漏群数据）" : "";
    hint.textContent = extPts.length+" 个采样点 · "+ids.length+" 个群"+warn+" · 点击群名单独看 · 拖动平移 · 滚轮/双指缩放";
  }
}

/* 缩放/平移控制：按钮 + 滚轮（指针锚定）+ 鼠标拖拽 + 单指横滑 + 双指捏合（中心锚定） */
(function bindZoom(){
  var svg = document.getElementById("pulseSvg");
  if(!svg) return;
  var MAXZ = 32;
  function clampView(){
    pulseState.zoom = Math.min(Math.max(1, pulseState.zoom), MAXZ);
    var ms = 1 - 1/pulseState.zoom;
    pulseState.viewStart = Math.min(Math.max(0, pulseState.viewStart), ms);
  }
  function plotFrac(clientX){
    var r = svg.getBoundingClientRect();
    var f = (clientX - r.left - 26) / Math.max(1, r.width - 26 - 60);
    return Math.min(1, Math.max(0, f));
  }
  function zoomAt(f, frac){
    var anchor = pulseState.viewStart + frac / pulseState.zoom;
    pulseState.zoom = Math.min(MAXZ, Math.max(1, pulseState.zoom * f));
    pulseState.viewStart = anchor - frac / pulseState.zoom;
    clampView(); drawPulseChart();
  }
  var zi=$("#zoomIn"), zo=$("#zoomOut"), zr=$("#zoomReset");
  if(zi) zi.addEventListener("click", function(){ zoomAt(1.6, .5); });
  if(zo) zo.addEventListener("click", function(){ zoomAt(1/1.6, .5); });
  if(zr) zr.addEventListener("click", function(){ pulseState.zoom=1; pulseState.viewStart=0; drawPulseChart(); });
  svg.addEventListener("dblclick", function(){ pulseState.zoom=1; pulseState.viewStart=0; drawPulseChart(); });
  /* 滚轮：以指针位置为锚点缩放 */
  svg.addEventListener("wheel", function(e){
    e.preventDefault();
    zoomAt(e.deltaY<0 ? 1.25 : 1/1.25, plotFrac(e.clientX));
  }, {passive:false});
  /* 鼠标拖拽平移 */
  var mDown = null;
  svg.addEventListener("mousedown", function(e){
    mDown = {x: e.clientX, start: pulseState.viewStart, zoom: pulseState.zoom};
    e.preventDefault();
  });
  window.addEventListener("mousemove", function(e){
    if(!mDown) return;
    var r = svg.getBoundingClientRect();
    pulseState.viewStart = mDown.start - (e.clientX - mDown.x) / Math.max(1, r.width) / mDown.zoom;
    clampView(); drawPulseChart();
  });
  window.addEventListener("mouseup", function(){ mDown = null; });
  /* 触屏：双指捏合缩放（中心锚定）；单指横滑平移（竖向手势留给页面滚动，X5 兼容） */
  var tMode = null, tX = 0, tY = 0, tStart = 0, tZoom = 1;
  var pDist = 0, pFrac = 0, pAt = 0, pZoom0 = 1;
  svg.addEventListener("touchstart", function(e){
    if(e.touches.length === 2){
      tMode = "pinch";
      pDist = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      pFrac = plotFrac((e.touches[0].clientX + e.touches[1].clientX)/2);
      pAt = pulseState.viewStart + pFrac / pulseState.zoom;
      pZoom0 = pulseState.zoom;
    }else if(e.touches.length === 1){
      tMode = null;
      tX = e.touches[0].clientX; tY = e.touches[0].clientY;
      tStart = pulseState.viewStart; tZoom = pulseState.zoom;
    }
  }, {passive:true});
  svg.addEventListener("touchmove", function(e){
    if(e.touches.length === 2 && tMode === "pinch" && pDist > 0){
      e.preventDefault();
      var d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      pulseState.zoom = Math.min(MAXZ, Math.max(1, pZoom0 * d / pDist));
      pulseState.viewStart = pAt - pFrac / pulseState.zoom;
      clampView(); drawPulseChart();
      return;
    }
    if(e.touches.length === 1){
      var dx = e.touches[0].clientX - tX, dy = e.touches[0].clientY - tY;
      if(tMode === null){
        if(Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)*1.2) tMode = "pan";   /* 全量状态也允许横滑平移 */
        else if(Math.abs(dy) > 10) tMode = "scroll";
      }
      if(tMode === "pan"){
        e.preventDefault();
        var r = svg.getBoundingClientRect();
        pulseState.viewStart = tStart - dx / Math.max(1, r.width) / tZoom;
        clampView(); drawPulseChart();
      }
    }
  }, {passive:false});
  function tEnd(e){
    if(e.touches.length < 2){ pDist = 0; if(tMode === "pinch") tMode = null; }
    if(!e.touches.length) tMode = null;
  }
  svg.addEventListener("touchend", tEnd);
  svg.addEventListener("touchcancel", tEnd);
})();
/* 兜底：部分移动端内核在 DOMContentLoaded 时布局宽度尚未就绪，
   数据回来后再触发一次重绘，确保曲线显示 */
addEventListener("load", function(){
  if(pulseState.recent && pulseState.recent.length) drawPulseChart();
});
var _rszT;
addEventListener("resize", function(){
  clearTimeout(_rszT);
  _rszT = setTimeout(function(){ if(pulseState.recent && pulseState.recent.length) drawPulseChart(); }, 200);
});


/* 优先使用每 6 小时定时采样的快照：稳定、不消耗访客接口额度 */
var snapshotReady = false;
var snapshotLoaded = new Promise(function(resolve){
  /* 同域代理 ./api/history（服务器端读 GitHub 最新数据，国内手机可通）；
     代理异常时回退站点同源副本 */
  fetch("./api/history").then(function(r){ return r.ok ? r.json() : null; })
  .catch(function(){ return null; })
  .then(function(j0){
    if(j0) return j0;
    return fetch("./history.json?_="+Date.now()).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
  }).then(function(j){
    var pts = j && j.points;
    if(pts && pts.length){
      /* 取最近一个带群人数(g)的点——纯 EC 采样点无 g，不能用末点 */
      var lastG = null;
      for(var pi=pts.length-1; pi>=0; pi--){ if(pts[pi].g && Object.keys(pts[pi].g).length){ lastG=pts[pi]; break; } }
      var g = (lastG && lastG.g) || {};
      var now = Date.now(), sum = 0, n = 0;
      Object.keys(g).forEach(function(k){
        if(typeof g[k]==="number"){
          sum+=g[k]; n++;
          if(!memCache[k]) memCache[k] = {count:g[k], max:0, ts:now};
        }
      });
      if(n){
        snapshotReady = true;
        var el0 = $("#stMembers");
        el0.textContent = sum.toLocaleString();
        el0.style.visibility = "visible";
        var lbl = $("#liveLbl");
        if(lbl){
          lbl.dataset.locked = "1";
          lbl.textContent = "社群总人数 · 点击查看趋势";
        }
        var tag = $("#liveTag");
        if(tag) tag.textContent = "每 6 小时更新";
        renderPulse(pts);   /* 总人数迷你曲线 + 各群全景图 */
      }
    }
    resolve();
  }).catch(function(){ resolve(); });
});

/* 群资料快照（人数/群名/加群链接）：一次请求拿全量，避免逐群实时查询造成卡顿 */
var groupsLoaded = new Promise(function(resolve){
  fetch("./api/groups?_="+Date.now()).then(function(r){ return r.ok ? r.json() : null; })
  .catch(function(){ return null; })
  .then(function(j){
    var gs = j && j.groups, now = Date.now(), n = 0;
    if(gs){
      Object.keys(gs).forEach(function(k){
        var d = gs[k];
        if(d && typeof d.count === "number"){
          memCache[k] = {count:d.count, max:d.max||0, name:d.name||"", join:d.join||"", ts:now};
          n++;
        }
      });
    }
    if(n){
      try{ localStorage.setItem(CACHE_KEY, JSON.stringify(memCache)); }catch(e){}
      renderTable();   /* 仅重绘一次：全表人数 + 加群链接同时就绪 */
    }
    resolve(n);
  }).catch(function(){ resolve(0); });
});

/* ================= 社群表格 ================= */
var tbody = $("#gtbody");
var view = { cat:"all", q:"", sort:"default" };
var rowIO = ("IntersectionObserver" in window) ? new IntersectionObserver(function(es){
  es.forEach(function(en){
    if(!en.isIntersecting) return;
    var tr = en.target; rowIO.unobserve(tr);
    if(LITE){ tr.classList.add("in"); animateRatio(tr); }  /* X5：取消错峰入场，立即显示，避免逐行延迟造成的卡顿/空白 */
    else setTimeout(function(){ tr.classList.add("in"); animateRatio(tr); }, Math.min((+tr.dataset.idx)*38, 500));
    var gid = tr.dataset.gid;
    if(gid && !memState[gid]) loadMember(tr, gid);
  });
},{rootMargin:"700px"}) : null;

function renderTable(){
  var list = groups.slice();
  if(view.cat!=="all") list = list.filter(function(g){return g.cat===view.cat});
  if(view.q){
    var q = view.q.toLowerCase();
    list = list.filter(function(g){ return g.name.toLowerCase().indexOf(q)>-1 || (g.id||"").indexOf(q)>-1; });
  }
  if(view.sort==="male") list.sort(function(a,b){return (b.male||0)-(a.male||0)});
  else if(view.sort==="female") list.sort(function(a,b){return (b.female||0)-(a.female||0)});
  else if(view.sort==="members") list.sort(function(a,b){
    var ca=(a.id&&memCache[a.id])?memCache[a.id].count:-1, cb=(b.id&&memCache[b.id])?memCache[b.id].count:-1;
    return cb-ca;
  });

  tbody.innerHTML = "";
  $("#tableEmpty").hidden = list.length>0;
  list.forEach(function(g, idx){
    var tr = document.createElement("tr");
    tr.dataset.idx = idx;
    if(g.id) tr.dataset.gid = g.id;
    var catTag = g.cat==="official" ? '<span class="cat official">官方</span>' : '<span class="cat">玩家</span>';
    var unk = (typeof g.male!=="number"||typeof g.female!=="number");
    var u = unk ? 100 : Math.max(0, 100-g.male-g.female);
    var ratioHtml = g.defunct ? '<span class="defunct">已失效</span>' :
      '<div class="ratio"><div class="ratio-bar">'+
      '<i class="m" data-w="'+(unk?0:g.male)+'"></i><i class="f" data-w="'+(unk?0:g.female)+'"></i><i class="u" data-w="'+u+'"></i></div>'+
      '<div class="ratio-num">'+(unk
        ? '<span class="u">性别数据未知</span>'
        : '<span class="m">男 '+g.male+'%</span><span class="f">女 '+g.female+'%</span><span class="u">未知 '+u+'%</span>')+
      '</div></div>';
    var memHtml = g.defunct ? '—' :
      (memCache[g.id] && typeof memCache[g.id].count==="number"
        ? '<span>'+memCache[g.id].count.toLocaleString()+'</span><span class="max"> / '+memCache[g.id].max+'</span>'
        : '<span class="skl"></span>');
    var joinCached = (memCache[g.id] && memCache[g.id].join) || "#";
    var opHtml = g.defunct ? '' : '<a class="join" data-join href="'+joinCached+'" target="_blank" rel="noopener">加群 ↗</a>';
    tr.innerHTML =
      '<td class="c-i">'+String(idx+1).padStart(2,"0")+'</td>'+
      '<td class="g-name">'+catTag+'<span class="nm" title=""><span class="nm-t"></span></span></td>'+
      '<td class="c-id">'+(g.id?'<span class="g-id" title="点击复制">'+g.id+'</span>':'—')+'</td>'+
      '<td class="c-m"><span class="g-mem">'+memHtml+'</span></td>'+
      '<td>'+ratioHtml+'</td>'+
      '<td class="c-op">'+opHtml+'</td>';
    tr.querySelector(".nm-t").textContent = g.name;
    tr.querySelector(".nm").title = g.name;
    tbody.appendChild(tr);
  });
  // 事件委托：复制群号 / 加群
  bindTableEvents();
  observeRows();
  $("#tableNote").textContent = "显示 " + list.length + " / " + groups.length + " 个社群 · 群号点击可复制 · 人数为每 6 小时采样数据";
}
function animateRatio(tr){
  tr.querySelectorAll(".ratio-bar i").forEach(function(bar){
    bar.style.width = bar.dataset.w + "%";
  });
}
function observeRows(){
  var rows = tbody.querySelectorAll("tr");
  rows.forEach(function(tr){
    if(rowIO) rowIO.observe(tr);
    else { tr.classList.add("in"); animateRatio(tr); if(tr.dataset.gid && !memState[tr.dataset.gid]) loadMember(tr, tr.dataset.gid); }
  });
}
/* 预热：带 key 时全量后台加载，否则先加载前 24 个；其余行滚动接近时自动加载 */
function preloadMembers(){
  var limit = hasKey ? groups.length : 24, n = 0;
  for(var i=0;i<groups.length && n<limit;i++){
    var g = groups[i];
    if(g.defunct || !g.id || memState[g.id]) continue;
    if(memCache[g.id] && typeof memCache[g.id].count === "number") continue; /* 快照已覆盖，不再实时查 */
    memState[g.id] = "queued"; n++;
    fetchGroup(g.id, function(){ updateRowIfVisible(g.id); });
  }
}
/* 等快照加载完再启动实时查询：有快照时 preload 直接命中缓存，不会重复调接口。
   延后到浏览器空闲帧再跑，避免和"进入后"的首屏渲染挤在同一帧（X5 低端机尤为明显） */
var __ric = window.requestIdleCallback ? function(cb){ requestIdleCallback(cb, {timeout:1500}); } : function(cb){ setTimeout(cb, 300); };
Promise.all([snapshotLoaded, groupsLoaded]).then(function(){ __ric(preloadMembers); });
function loadMember(tr, id){
  memState[id] = "loading";
  var cell = tr.querySelector(".g-mem");
  if(cell && !cell.querySelector(".skl") && !cell.querySelector(".fail")) {
    /* 已加载 */
  } else if(cell) cell.innerHTML = '<span class="skl"></span>';
  fetchGroup(id, function(err, data){
    if(err){
      memState[id] = "fail";
      if(cell){
        if(err.rateLimit){ cell.innerHTML = '<span style="color:var(--ink-3);font-size:12px">已达限额</span>'; }
        else{
          cell.innerHTML = '<span class="fail" title="点击重试">获取失败 ↻</span>';
          cell.querySelector(".fail").addEventListener("click", function(){
            delete memState[id]; loadMember(tr, id);
          });
        }
      }
      return;
    }
    memState[id] = "done";
    if(cell){
      cell.innerHTML = '';
      var s = document.createElement("span"); cell.appendChild(s);
      countUp(s, data.count, 700);
      var mx = document.createElement("span"); mx.className="max"; mx.textContent=" / "+data.max; cell.appendChild(mx);
    }
    var join = tr.querySelector("[data-join]");
    if(join && data.join) join.href = data.join;
    // 若接口返回的群名与统计名差异很大，悬浮提示真实群名
    if(data.name){ var nm = tr.querySelector(".nm"); if(nm) nm.title = "接口返回群名：" + data.name; }
  });
}
function bindTableEvents(){
  tbody.onclick = function(e){
    var idEl = e.target.closest(".g-id");
    if(idEl){ copyText(idEl.textContent); return; }
    var j = e.target.closest("[data-join]");
    if(j && j.getAttribute("href")==="#"){
      e.preventDefault();
      var jtr = j.closest("tr"), jgid = jtr && jtr.dataset.gid;
      /* 失败或未排队的：立即补一次请求；已在加载中的就等它 */
      if(jgid && memState[jgid] !== "loading" && memState[jgid] !== "queued"){
        delete memState[jgid]; loadMember(jtr, jgid);
      }
      toast("正在获取该群加群链接…");
      /* 轮询就绪后提醒一次（最多等 20 秒） */
      var wt0 = Date.now();
      (function waitReady(){
        if(j.getAttribute("href") !== "#"){ toast("加群链接已就绪，再点一次打开 ↗"); return; }
        if(Date.now() - wt0 < 20000) setTimeout(waitReady, 500);
      })();
    }
  };
}
var __searchTm;
$("#searchInput").addEventListener("input", function(){
  var v = this.value.trim();
  clearTimeout(__searchTm);
  __searchTm = setTimeout(function(){ view.q = v; renderTable(); }, 160);  /* 防抖：避免每敲一个字就全量重建 118 行表格 */
});
$("#catChips").addEventListener("click", function(e){
  var b = e.target.closest(".chip"); if(!b) return;
  document.querySelectorAll("#catChips .chip").forEach(function(c){c.classList.remove("on")});
  b.classList.add("on"); view.cat = b.dataset.cat; renderTable();
});
$("#sortSel").addEventListener("change", function(){ view.sort = this.value; renderTable(); });

/* ================= 全局交互音效 ================= */
if(window.EC_SFX){
  var btnSfx = $("#btnSfx");
  function syncSfxBtn(){ if(btnSfx) btnSfx.style.color = EC_SFX.isOn() ? "" : "var(--ink-3)"; if(btnSfx) btnSfx.textContent = EC_SFX.isOn() ? "音效" : "音效·关"; }
  syncSfxBtn();
  if(btnSfx) btnSfx.addEventListener("click", function(){
    var on = EC_SFX.toggle(); syncSfxBtn(); toast(on ? "音效已开启" : "音效已关闭");
  });
  /* 点击类：按钮 / 筛选 / 排行切换 / 加群 / 频道卡片 */
  document.addEventListener("click", function(e){
    if(e.target.closest(".chip, .rank-toggle, .join, .ch, .fail, .menu-btn, .head-nav a, .mm-panel a, .mm-panel button, .drop-menu a")){
      EC_SFX.play("click");
    }
  });
  /* 悬停类：仅桌面指针设备，导航链接 */
  if(window.matchMedia && matchMedia("(pointer: fine)").matches){
    document.querySelectorAll(".head-nav a, .head-nav button, .chip").forEach(function(el){
      el.addEventListener("mouseenter", function(){ EC_SFX.play("hover"); });
    });
  }
  /* 失败反馈：点击重试前提示 */
  document.addEventListener("click", function(e){
    if(e.target.closest(".fail")) EC_SFX.play("error");
  }, true);
}

/* ================= 频道 / 页脚 ================= */
window.__chIcoHtml = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 18 0"/><path d="M2 11h4v7H2zM18 11h4v7h-4z"/></svg>';

(function renderChannels(){
  var box = $("#chGrid");
  D.channels.forEach(function(c){
    var el = document.createElement("div"); el.className = "ch";
    var icoHtml = c.avatar
      ? '<img class="avatar" src="'+c.avatar+'" alt="" loading="lazy" onerror="this.outerHTML=window.__chIcoHtml">'
      : window.__chIcoHtml;
    el.innerHTML = '<span class="ico">'+icoHtml+'</span>'+
      '<span><span class="nm"></span><span class="cid" style="display:block"></span></span>';
    el.querySelector(".nm").textContent = c.name;
    el.querySelector(".cid").textContent = c.id;
    el.addEventListener("click", function(){ copyText(c.id, "已复制频道号 " + c.id); });
    box.appendChild(el);
  });
})();
(function renderFooter(){
  $("#footMaintainers").innerHTML = D.maintainers.map(function(m){
    var s = document.createElement("span");
    return m.name + ' <span class="qq">' + m.qq + '</span>';
  }).join("<br/>");
  var sg = D.statsGroup;
  $("#footStatsGroup").innerHTML = '';
  var a = document.createElement("a"); a.href = sg.joinUrl; a.target = "_blank"; a.rel = "noopener";
  a.textContent = sg.name + "：" + sg.id;
  $("#footStatsGroup").appendChild(a);
  $("#footNote").textContent = "群性别占比由统计组人工统计（版本 " + D.version + "）；群人数每 6 小时自动采样更新。";
})();

renderTable();
}
