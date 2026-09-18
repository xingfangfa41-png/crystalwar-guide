#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描贴图目录生成素材空间索引 textures-index[-<ver>].js（分类 -> 文件名 + 中文名 + 动画帧数）
用法: python3 gen-textures-index.py            # 默认 1.21.9 -> textures-index.js
      python3 gen-textures-index.py 1.8.8      # -> textures-index-188.js
"""
import os, json, re, sys

VER = sys.argv[1] if len(sys.argv) > 1 else "1.21.9"
BASE = os.path.dirname(os.path.abspath(__file__))
if VER == "1.21.9":
    ROOT = os.path.join(BASE, "textures")
    OUT = os.path.join(BASE, "textures-index.js")
    VAR = "EC_TEXTURES"
    LABEL = "1.21.9"
else:
    ROOT = os.path.join(BASE, "versions", VER)
    OUT = os.path.join(BASE, f"textures-index-{VER.replace('.','')}.js")
    VAR = "EC_TEXTURES_" + VER.replace(".", "")
    LABEL = VER
if not os.path.isdir(ROOT):
    ROOT = os.path.join(BASE, "texsrc")

try:
    from PIL import Image
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False

def frames_of(path):
    """单文件多帧贴图：高>宽且能被宽整除 -> 返回帧数（帧为方形纵向堆叠）；否则 None"""
    if not HAVE_PIL:
        return None
    try:
        im = Image.open(path)
        w, h = im.size
        if h > w and h % w == 0 and (h // w) > 1:
            return h // w
    except Exception:
        pass
    return None

# 分类定义：(目录, 中文名, 图标emoji)
CATS = [
    ("blocks",    "方块",  "🧱"),
    ("items",     "物品",  "🛠️"),
    ("entity",    "生物",  "👾"),
    ("painting",  "画作",  "🖼️"),
    ("environment","环境", "🌍"),
    ("particle",  "粒子",  "✨"),
    ("misc",      "杂项",  "📦"),
    ("map",       "地图",  "🗺️"),
    ("mob_effect","状态效果","💊"),
    ("effect",    "特效",  "⚡"),
    ("trims",     "盔甲纹饰","🎨"),
]

# 常用 Minecraft 词 -> 中文（文件名 snake_case 拆分后逐词翻译）
DICT = {
    # 方块/矿物/材料
    "stone":"石头","cobblestone":"圆石","deepslate":"深板岩","andesite":"安山岩","granite":"花岗岩",
    "diorite":"闪长岩","dirt":"泥土","grass":"草","sand":"沙子","gravel":"砂砾","clay":"黏土",
    "mud":"泥巴","tuff":"凝灰岩","basalt":"玄武岩","obsidian":"黑曜石","bedrock":"基岩",
    "oak":"橡木","spruce":"云杉","birch":"白桦","jungle":"丛林","acacia":"金合欢","dark_oak":"深色橡木",
    "mangrove":"红树","cherry":"樱花","pale_oak":"苍白橡木","log":"原木","planks":"木板","leaves":"树叶",
    "sapling":"树苗","dandelion":"蒲公英","poppy":"虞美人","rose":"玫瑰","tulip":"郁金香","sunflower":"向日葵",
    "wheat":"小麦","carrots":"胡萝卜","potatoes":"马铃薯","beetroot":"甜菜根","pumpkin":"南瓜","melon":"西瓜",
    "sugar_cane":"甘蔗","bamboo":"竹子","cactus":"仙人掌","mushroom":"蘑菇","wart":"疣","vine":"藤蔓",
    "kelp":"海带","seagrass":"海草","lily":"百合","pad":"浮萍","water":"水","lava":"岩浆",
    "coal":"煤炭","iron":"铁","gold":"金","diamond":"钻石","emerald":"绿宝石","redstone":"红石",
    "lapis":"青金石","copper":"铜","quartz":"石英","amethyst":"紫水晶","netherite":"下界合金",
    "ancient_debris":"远古残骸","raw":"粗","ore":"矿石","block":"块","ingot":"锭","nugget":"粒",
    "gem":"宝石","crystal":"水晶","shard":"碎片","dust":"粉","stick":"木棍","bowl":"碗",
    # 工具/武器/装备
    "sword":"剑","pickaxe":"镐","axe":"斧","shovel":"锹","hoe":"锄","bow":"弓","arrow":"箭",
    "shield":"盾牌","helmet":"头盔","chestplate":"胸甲","leggings":"护腿","boots":"靴子",
    "elytra":"鞘翅","trident":"三叉戟","fishing_rod":"钓鱼竿","shears":"剪刀","flint":"燧石",
    "steel":"钢","bucket":"桶","milk":"牛奶","egg":"蛋","compass":"指南针","clock":"钟","map":"地图",
    "book":"书","enchanted":"附魔","paper":"纸","ink":"墨水","feather":"羽毛","bone":"骨头",
    "string":"线","leather":"皮革","rabbit":"兔子","hide":"皮","spider":"蜘蛛","eye":"眼睛",
    "blaze":"烈焰人","rod":"棒","ender":"末影","pearl":"珍珠","ghast":"恶魂","tear":"泪",
    "gunpowder":"火药","sugar":"糖","slime":"史莱姆","ball":"球","magma":"岩浆","cream":"膏",
    "glowstone":"萤石","dust":"粉","nether":"下界","star":"星","firework":"烟花","rocket":"火箭",
    "saddle":"鞍","lead":"拴绳","name":"命名","tag":"标签","flower":"花","pot":"盆","banner":"旗帜",
    "bed":"床","door":"门","trapdoor":"活板门","fence":"栅栏","gate":"门","wall":"墙","stairs":"楼梯",
    "slab":"台阶","glass":"玻璃","pane":"板","wool":"羊毛","carpet":"地毯","terracotta":"陶瓦",
    "concrete":"混凝土","powder":"粉","brick":"砖","nether_brick":"下界砖","prismarine":"海晶石",
    "shulker":"潜影贝","box":"盒","chest":"箱子","barrel":"木桶","furnace":"熔炉","crafting":"合成",
    "table":"台","anvil":"铁砧","enchanting":"附魔","brewing":"酿造","stand":"架","cauldron":"炼药锅",
    "hopper":"漏斗","dispenser":"发射器","dropper":"投掷器","piston":"活塞","sticky":"黏性",
    "lever":"拉杆","button":"按钮","torch":"火把","lantern":"灯笼","lamp":"灯","sea":"海","candle":"蜡烛",
    "cake":"蛋糕","cookie":"曲奇","apple":"苹果","bread":"面包","meat":"肉","fish":"鱼","salmon":"鲑鱼",
    "cod":"鳕鱼","porkchop":"猪排","beef":"牛排","chicken":"鸡肉","mutton":"羊肉","pork":"猪肉",
    "golden":"金","enchanted":"附魔","suspicious":"可疑","stew":"炖菜","soup":"汤","honey":"蜂蜜",
    "bottle":"瓶","potion":"药水","potion":"药水","milk":"奶","bucket":"桶","spawn":"生成","chunk":"区块",
    # 生物
    "zombie":"僵尸","skeleton":"骷髅","creeper":"苦力怕","enderman":"末影人","witch":"女巫",
    "pig":"猪","cow":"牛","sheep":"羊","chicken":"鸡","wolf":"狼","fox":"狐狸","cat":"猫",
    "horse":"马","donkey":"驴","mule":"骡","llama":"羊驼","camel":"骆驼","rabbit":"兔子",
    "turtle":"海龟","panda":"熊猫","polar":"北极","bear":"熊","bee":"蜜蜂","bat":"蝙蝠",
    "squid":"鱿鱼","dolphin":"海豚","axolotl":"美西螈","frog":"青蛙","tadpole":"蝌蚪",
    "allay":"悦灵","villager":"村民","iron_golem":"铁傀儡","snow_golem":"雪傀儡",
    "blaze":"烈焰人","magma_cube":"岩浆怪","slime":"史莱姆","ghast":"恶魂","wither":"凋灵",
    "skeleton":"骷髅","stray":"流髑","husk":"尸壳","drowned":"溺尸","phantom":"幻翼",
    "piglin":"猪灵","brute":"蛮兵","hoglin":"疣猪兽","zoglin":"僵尸疣猪兽","warden":"循声守卫",
    "guardian":"守卫者","elder":"远古","shulker":"潜影贝","endermite":"末影螨","silverfish":"蠹虫",
    "spider":"蜘蛛","cave_spider":"洞穴蜘蛛","creeper":"苦力怕","snowman":"雪人",
    "mooshroom":"哞菇","ocelot":"豹猫","parrot":"鹦鹉","goat":"山羊","sniffer":"嗅探兽",
    "armadillo":"犰狳","breeze":"旋风人","vex":"恼鬼","evoker":"唤魔者","vindicator":"卫道士",
    "ravager":"劫掠兽","pillager":"掠夺者","illager":"灾厄村民","wandering":"流浪","trader":"商人",
    "glow":"发光","squid":"鱿鱼","fish":"鱼","pufferfish":"河豚","tropical":"热带",
    "egg":"蛋","chicken":"鸡","skeleton_horse":"骷髅马","zombie_horse":"僵尸马",
    # 部件/其他
    "top":"顶","bottom":"底","side":"侧","front":"前","back":"后","inner":"内","outer":"外",
    "open":"开","closed":"闭","full":"满","empty":"空","on":"开","off":"关","lit":"点亮",
    "unlit":"未点亮","normal":"法线","specular":"高光","emissive":"发光","mer":"金属度",
    "planks":"木板","door":"门","trapdoor":"活板门","button":"按钮","pressure":"压力","plate":"板",
    "rail":"铁轨","track":"轨道","boat":"船","chest":"箱","minecart":"矿车","sign":"告示牌",
    "hanging":"悬挂","bell":"钟","chain":"锁链","tripwire":"绊线","hook":"钩","scaffolding":"脚手架",
    "ladder":"梯子","vine":"藤蔓","snow":"雪","ice":"冰","packed":"浮冰","blue":"蓝","frosted":"霜冻",
    "pointed":"尖","dripstone":"滴水石","sculk":"幽匿","sensor":"感测体","shrieker":"尖啸体",
    "vein":"脉络","catalyst":"催化","charger":"充能","tongue":"舌","smoker":"烟熏炉","blast":"爆破",
    "furnace":"熔炉","grindstone":"砂轮","smithing":"锻造","cartography":"制图","stonecutter":"切石机",
    "loom":"织布机","composter":"堆肥桶","jukebox":"唱片机","note":"音符","block":"方块",
    "observer":"侦测器","target":"标靶","daylight":"日光","detector":"探测","activator":"激活",
    "powered":"充能","unpowered":"未充能","repeater":"中继器","comparator":"比较器","redstone":"红石",
    "torch":"火把","lamp":"灯","sea_lantern":"海晶灯","jack_o_lantern":"南瓜灯","head":"头颅",
    "skull":"头颅","bone":"骨","coral":"珊瑚","fan":"扇","tube":"管","brain":"脑","bubble":"气泡",
    "horn":"角","fire":"火","campfire":"营火","soul":"灵魂","flame":"火焰","portal":"传送门",
    "frame":"框","item":"物品","glow":"发光","frame":"框","lily":"百合","pod":"荚","azalea":"杜鹃",
    "rooted":"扎根","moss":"苔藓","carpet":"地毯","clover":"三叶草","mossy":"苔石","cracked":"裂纹",
    "chiseled":"錾制","polished":"磨制","cut":"切制","smooth":"平滑","waxed":"涂蜡","oxidized":"氧化",
    "weathered":"风化","exposed":"斑驳","copper":"铜","grate":"格栅","bulb":"灯","trial":"试炼",
    "chamber":"室","spawner":"刷怪笼","vault":"宝库","ominous":"不祥","key":"钥匙","trial":"试炼",
    "barrel":"桶","crate":"箱","bundle":"收纳袋","brush":"刷子","pottery":"陶","sherd":"碎片",
    "decorated":"装饰","pot":"罐","painting":"画","crossbow":"弩","armor":"盔甲","stand":"架",
    "shulker":"潜影贝","box":"盒","dye":"染料","white":"白","black":"黑","red":"红","blue":"蓝",
    "green":"绿","yellow":"黄","orange":"橙","purple":"紫","pink":"粉","cyan":"青","gray":"灰",
    "lime":"黄绿","brown":"棕","light":"淡","dark":"深","magenta":"品红","crimson":"绯红","warped":"诡异",
    "nether":"下界","portal":"传送门","wart":"疣","fungus":"菌","roots":"根","sprouts":"芽","stem":"茎",
    "hyphae":"菌核","mushroom":"蘑菇","block":"块","spore":"孢子","blossom":"花",
    "tuff":"凝灰岩","brick":"砖","sniffer":"嗅探兽","armadillo":"犰狳","scute":"鳞甲",
    "wolf":"狼","armor":"盔甲","saddle":"鞍","carpet":"地毯","chested":"箱式","trader":"商",
    "llama":"羊驼","decorated":"装饰","pot":"罐","sherd":"碎片","banner":"旗帜","pattern":"图案",
    "shield":"盾","base":"底","border":"边","bricks":"砖","field":"野","gradient":"渐变","stripe":"条纹",
    "creeper":"苦力怕","charge":"充能","flower":"花","globe":"球","mojang":"徽标","piglin":"猪灵",
    "skull":"头颅","thing":"物","wind":"风","charge":"充能","party":"派对","snout":"鼻",
    "loom":"织布机","banner":"旗帜","piglin":"猪灵","gray":"灰","light":"淡","dark":"深",
    "blue":"蓝","red":"红","green":"绿","yellow":"黄","purple":"紫","pink":"粉","cyan":"青",
    "lime":"黄绿","brown":"棕","orange":"橙","magenta":"品红","black":"黑","white":"白",
}

def translate(name):
    """把 snake_case 文件名翻成中文（尽力而为，失败保留英文）"""
    base = name.replace(".png", "")
    parts = [p for p in re.split(r"[_\-]", base) if p]
    out = []
    used = set()
    for p in parts:
        if p in DICT:
            out.append(DICT[p])
            used.add(p)
        elif p.isdigit():
            out.append(p)
        else:
            out.append(p)
    if not out:
        return base
    cn = "".join(out)
    # 全数字/无翻译命中时显示原名
    if not any(p in DICT for p in parts):
        return base
    return cn

def main():
    index = {"version": LABEL, "categories": []}
    total = 0
    for d, cn, icon in CATS:
        dpath = os.path.join(ROOT, d)
        if not os.path.isdir(dpath):
            continue
        files = []
        for root, _, fs in os.walk(dpath):
            for f in fs:
                if f.endswith(".png"):
                    rel = os.path.relpath(os.path.join(root, f), dpath).replace("\\", "/")
                    ent = {"f": rel, "cn": translate(os.path.basename(rel))}
                    fa = frames_of(os.path.join(root, f))
                    if fa:
                        ent["a"] = fa
                    files.append(ent)
        files.sort(key=lambda x: x["f"])
        total += len(files)
        index["categories"].append({"id": d, "name": cn, "icon": icon, "count": len(files), "files": files})
    index["total"] = total
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(f"/* EC 素材空间 · Minecraft {LABEL} 贴图索引（PrismarineJS/minecraft-assets 镜像，自动生成） */\n")
        f.write(f"window.{VAR} = " + json.dumps(index, ensure_ascii=False) + ";\n")
    print(f"生成完成：{total} 张贴图，{len(index['categories'])} 个分类 -> {OUT}")

if __name__ == "__main__":
    main()
