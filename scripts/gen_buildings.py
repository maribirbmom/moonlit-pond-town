"""Draws the Pet Decor, Arcade and Bus Stop buildings as flat, front-facing pixel art.
Run: python3 scripts/gen_buildings.py   (needs Pillow). Output goes to src/assets/game/."""
from PIL import Image
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "game")
SCALE = 3
OL = (59, 44, 69, 255)  # outline


def hx(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


class Cv:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.p = self.im.load()

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[x, y] = hx(c) if isinstance(c, str) else c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, c)

    def box(self, x0, y0, x1, y1, fill, edge):
        self.rect(x0, y0, x1, y1, edge)
        self.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill)

    def hline(self, x0, x1, y, c):
        for x in range(x0, x1 + 1):
            self.px(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(y0, y1 + 1):
            self.px(x, y, c)

    def disc(self, cx, cy, r, c):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6:
                    self.px(x, y, c)

    def outline(self, col=OL):
        src = self.im.copy().load()
        for y in range(self.h):
            for x in range(self.w):
                if src[x, y][3] == 0:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < self.w and 0 <= ny < self.h and src[nx, ny][3] > 0:
                            self.p[x, y] = col
                            break

    def save(self, name):
        self.outline()
        self.im.resize((self.w * SCALE, self.h * SCALE), Image.NEAREST).save(os.path.join(OUT, name))


FONT = {
    "A": ["010", "101", "111", "101", "101"], "R": ["110", "101", "110", "101", "101"],
    "C": ["011", "100", "100", "100", "011"], "D": ["110", "101", "101", "101", "110"],
    "E": ["111", "100", "110", "100", "111"], "G": ["011", "100", "101", "101", "011"],
    "M": ["101", "111", "111", "101", "101"], "S": ["011", "100", "010", "001", "110"],
    "P": ["110", "101", "110", "100", "100"], "T": ["111", "010", "010", "010", "010"],
    "U": ["101", "101", "101", "101", "111"], "B": ["110", "101", "110", "101", "110"],
    "F": ["111", "100", "110", "100", "100"], "I": ["111", "010", "010", "010", "111"],
    "K": ["101", "110", "100", "110", "101"], "Y": ["101", "101", "010", "010", "010"],
    "L": ["100", "100", "100", "100", "111"], "O": ["010", "101", "101", "101", "010"],
    "W": ["101", "101", "111", "111", "101"], "H": ["101", "101", "111", "101", "101"],
    "V": ["101", "101", "101", "101", "010"], "N": ["110", "101", "101", "101", "101"],
    " ": ["000", "000", "000", "000", "000"],
}


def text(cv, s, x, y, col, vertical=False):
    for ch in s:
        g = FONT[ch]
        for r, row in enumerate(g):
            for c, v in enumerate(row):
                if v == "1":
                    cv.px(x + c, y + r, col)
        if vertical:
            y += 6
        else:
            x += 4


def gable_roof(cv, x0, x1, eave_y, apex_y, base, dark, light, rows=3):
    cx = (x0 + x1) // 2
    for y in range(apex_y, eave_y + 1):
        t = (y - apex_y) / max(1, eave_y - apex_y)
        half = int(2 + t * ((x1 - x0) / 2 - 2))
        for x in range(cx - half, cx + half + 1):
            row = (y - apex_y) // rows
            col = base if row % 2 == 0 else light
            # shingle scallops
            off = (row % 2) * 2
            if (x + off) % 4 == 0 and (y - apex_y) % rows == rows - 1:
                col = dark
            if (y - apex_y) % rows == rows - 1:
                col = dark if (x + off) % 4 in (0, 1) else col
            cv.px(x, y, col)
        cv.px(cx - half, y, dark)
        cv.px(cx + half, y, dark)
    # eave band
    cv.rect(x0 - 2, eave_y, x1 + 2, eave_y + 3, dark)
    cv.hline(x0 - 2, x1 + 2, eave_y + 1, base)


def planks(cv, x0, y0, x1, y1, base, line, step=4):
    cv.rect(x0, y0, x1, y1, base)
    for x in range(x0 + step, x1, step):
        cv.vline(x, y0, y1, line)


def bricks(cv, x0, y0, x1, y1, base, line):
    cv.rect(x0, y0, x1, y1, base)
    for i, y in enumerate(range(y0 + 3, y1, 4)):
        cv.hline(x0, x1, y, line)
        for x in range(x0 + (2 if i % 2 else 5), x1, 8):
            cv.vline(x, y - 3, y - 1, line)


def flowers(cv, x, y, cols, n=5, seed=1):
    import random
    r = random.Random(seed)
    for i in range(n):
        fx = x + i * 3 + r.randint(0, 1)
        cv.px(fx, y + 2, "#4f8f4f"); cv.px(fx, y + 3, "#3c6e3c")
        c = cols[i % len(cols)]
        cv.px(fx, y, c); cv.px(fx - 1, y + 1, c); cv.px(fx + 1, y + 1, c); cv.px(fx, y + 1, "#fff2c8")


def bush(cv, cx, cy, w, h, g1="#5a9a58", g2="#3f7a44", g3="#7cbc6a"):
    for y in range(h):
        t = (y / h) * 2 - 1
        half = int((w / 2) * (1 - t * t) ** 0.5)
        for x in range(-half, half + 1):
            cv.px(cx + x, cy + y, g3 if (x + y) % 5 == 0 else (g2 if y > h * 0.6 else g1))


# ---------------------------------------------------------------- Pet Decor
def pet_decor():
    cv = Cv(120, 112)
    # chimney
    cv.rect(88, 10, 98, 30, "#efe3d0"); cv.hline(88, 98, 12, "#d6c4ac"); cv.rect(86, 7, 100, 10, "#cdb8a0")
    cv.vline(94, 12, 30, "#d6c4ac")
    gable_roof(cv, 6, 114, 46, 8, "#8a6cc0", "#5f4596", "#a98fdc")
    # roof top finial
    cv.rect(59, 5, 61, 9, "#d9b34a")
    # gable window (arched)
    cv.rect(52, 24, 68, 40, "#f1dcc0"); cv.rect(54, 26, 66, 40, "#5f4596")
    cv.rect(55, 27, 65, 39, "#ffe9b0"); cv.vline(60, 27, 39, "#5f4596"); cv.hline(55, 65, 33, "#5f4596")
    cv.hline(55, 65, 27, "#fff7d6"); cv.px(56, 28, "#ffffff")
    cv.rect(50, 40, 70, 42, "#cdb8a0")
    # walls
    bricks(cv, 12, 50, 108, 104, "#f4e2c6", "#e6cfae")
    cv.rect(12, 50, 13, 104, "#dcc4a2"); cv.rect(106, 50, 107, 104, "#dcc4a2")
    cv.hline(12, 107, 50, "#c9b08e")
    # door
    cv.box(21, 62, 39, 104, "#9a7fd0", "#5f4596")
    cv.rect(23, 64, 37, 80, "#8266c0"); cv.rect(24, 66, 36, 79, "#ffe9b0")  # glass
    cv.hline(24, 36, 72, "#8266c0"); cv.vline(30, 66, 79, "#8266c0")
    cv.rect(24, 83, 36, 102, "#8a6ec8"); cv.hline(24, 36, 92, "#6f54ae")
    cv.px(35, 90, "#f2cf5a"); cv.px(35, 91, "#f2cf5a")
    # paw above door
    cv.rect(23, 53, 37, 60, "#cdb8a0"); cv.disc(30, 57, 2, "#8a6cc0")
    for dx in (-3, -1, 1, 3):
        cv.px(30 + dx, 54, "#8a6cc0")
    # awning over window
    for x in range(47, 105):
        stripe = ((x - 47) // 4) % 2 == 0
        cv.rect(x, 56, x, 62, "#f08aa8" if stripe else "#fff0e6")
        cv.px(x, 63, "#f08aa8" if stripe else "#fff0e6")
        cv.px(x, 64, "#c25f80" if stripe else "#e2cdbf") if (x % 4) in (1, 2) else None
    cv.hline(47, 104, 55, "#c25f80"); cv.hline(47, 104, 62, "#d9708f")
    # window
    cv.box(50, 66, 102, 94, "#cdb8a0", "#7a5fb0")
    cv.rect(52, 68, 100, 92, "#ffe3a8")
    cv.hline(52, 100, 69, "#fff3cc")
    cv.hline(52, 100, 80, "#a98fdc"); cv.hline(52, 100, 81, "#7a5fb0")
    cv.vline(76, 68, 92, "#cdb8a0")
    # shelf items: bows, bowls, bone
    for bx, c in ((56, "#f08aa8"), (63, "#8a6cc0"), (84, "#f08aa8"), (92, "#7ad0c8")):
        cv.rect(bx, 73, bx + 4, 79, c); cv.px(bx + 2, 75, "#ffffff")
    cv.rect(70, 76, 73, 79, "#f2cf5a")
    # dog on lower shelf
    cv.rect(58, 84, 70, 92, "#d8a566"); cv.rect(54, 80, 62, 88, "#e8b878")  # body + head
    cv.rect(53, 80, 55, 86, "#a8743c"); cv.rect(61, 80, 63, 85, "#a8743c")  # ears
    cv.px(56, 83, "#3b2c45"); cv.px(60, 83, "#3b2c45"); cv.px(58, 85, "#3b2c45")
    cv.rect(57, 87, 59, 88, "#f08aa8")
    # cat on right
    cv.rect(86, 84, 96, 92, "#c9b9d9"); cv.rect(88, 80, 94, 86, "#d9cbe8")
    cv.px(88, 79, "#c9b9d9"); cv.px(94, 79, "#c9b9d9"); cv.px(90, 83, "#3b2c45"); cv.px(93, 83, "#3b2c45")
    # window flower box
    cv.rect(48, 95, 104, 100, "#7a5fb0"); cv.rect(48, 95, 104, 95, "#a98fdc")
    flowers(cv, 51, 91, ["#f08aa8", "#ffffff", "#c9a0f0"], n=17, seed=3)
    # hanging round sign (left)
    cv.vline(9, 40, 56, "#5f4596"); cv.hline(9, 16, 40, "#5f4596")
    cv.vline(13, 41, 45, "#5f4596")
    cv.disc(13, 51, 6, "#f4a8bc"); cv.disc(13, 51, 4, "#ffe9ef")
    cv.disc(13, 52, 2, "#c25f80")
    for dx in (-3, -1, 1, 3):
        cv.px(13 + dx, 48 if abs(dx) == 1 else 49, "#c25f80")
    # chalkboard
    cv.vline(110, 96, 104, "#7a5a3a"); cv.rect(106, 82, 116, 98, "#7a5a3a")
    cv.rect(107, 83, 115, 96, "#3a3340")
    for y in (86, 89, 92):
        cv.hline(108, 113, y, "#e8e0f0")
    cv.px(112, 94, "#f08aa8")
    # planter + topiary
    cv.rect(42, 88, 47, 102, "#f4e2c6")
    cv.rect(14, 92, 20, 104, "#a8743c"); cv.rect(13, 90, 21, 93, "#c08850")
    bush(cv, 17, 84, 10, 8)
    # steps & base
    cv.rect(10, 104, 110, 108, "#a89bb8"); cv.hline(10, 110, 104, "#d6cce2")
    for x in range(14, 110, 12):
        cv.vline(x, 105, 108, "#8a7d9c")
    cv.rect(18, 108, 42, 110, "#9a8daa")
    cv.save("petdecor.png")


# ---------------------------------------------------------------- Arcade
def arcade():
    cv = Cv(120, 112)
    cv.rect(94, 12, 102, 34, "#6a5a8a"); cv.rect(92, 9, 104, 12, "#4b3d6a")
    gable_roof(cv, 6, 114, 50, 6, "#4e3f86", "#352a62", "#6a58a8")
    # neon sign panel in gable
    cv.rect(26, 22, 94, 44, "#241a42")
    cv.rect(26, 22, 94, 22, "#ff6ad5"); cv.rect(26, 44, 94, 44, "#ff6ad5")
    cv.vline(26, 22, 44, "#ff6ad5"); cv.vline(94, 22, 44, "#ff6ad5")
    cv.rect(28, 24, 92, 24, "#b04aa0"); cv.rect(28, 42, 92, 42, "#b04aa0")
    # controller icon
    cv.rect(33, 30, 43, 37, "#5fe0f0"); cv.px(33, 30, "#241a42"); cv.px(43, 30, "#241a42")
    cv.vline(36, 32, 35, "#241a42"); cv.hline(35, 37, 33, "#241a42"); cv.px(40, 32, "#ff6ad5"); cv.px(41, 34, "#ff6ad5")
    text(cv, "ARCADE", 49, 29, "#fff0fb")
    text(cv, "ARCADE", 49, 30, "#ff8fe0")
    # glow dots
    for gx in (24, 96):
        cv.px(gx, 32, "#ff9be6"); cv.px(gx, 33, "#ff6ad5")
    # walls
    planks(cv, 12, 54, 108, 104, "#a98bd0", "#9578bb", step=6)
    cv.rect(12, 54, 14, 104, "#8a6cb4"); cv.rect(106, 54, 108, 104, "#8a6cb4")
    cv.hline(12, 108, 54, "#6a4f96"); cv.hline(12, 108, 55, "#c4aae6")
    # windows
    for wx in (20, 76):
        cv.box(wx, 60, wx + 26, 92, "#6a4f96", "#3b2c69")
        cv.rect(wx + 2, 62, wx + 24, 90, "#ffcf7a")
        cv.hline(wx + 2, wx + 24, 63, "#ffe6a8")
        cv.vline(wx + 13, 62, 90, "#6a4f96")
        for i, (cx, sc) in enumerate(((wx + 4, "#5fe0f0"), (wx + 16, "#ff8fe0"))):
            cv.rect(cx, 70, cx + 7, 90, "#3b2c69")
            cv.rect(cx + 1, 72, cx + 6, 78, sc); cv.hline(cx + 1, cx + 6, 72, "#ffffff")
            cv.rect(cx + 1, 81, cx + 6, 82, "#f2cf5a"); cv.px(cx + 2, 84, "#ff6ad5"); cv.px(cx + 5, 84, "#5fe0f0")
        cv.rect(wx - 2, 92, wx + 28, 97, "#7a4f3a"); cv.hline(wx - 2, wx + 28, 92, "#a8743c")
    flowers(cv, 22, 90, ["#c9a0f0", "#ff8fe0", "#ffffff"], n=8, seed=5)
    flowers(cv, 78, 90, ["#c9a0f0", "#ff8fe0", "#ffffff"], n=8, seed=7)
    # door
    cv.box(51, 62, 69, 104, "#5a3f8c", "#2f2250")
    cv.rect(53, 64, 67, 82, "#ffcf7a"); cv.hline(53, 67, 70, "#5a3f8c"); cv.vline(60, 64, 82, "#5a3f8c")
    cv.rect(53, 84, 67, 102, "#6a4f9e"); cv.hline(53, 67, 93, "#4e3a80")
    cv.px(66, 92, "#f2cf5a"); cv.px(66, 93, "#f2cf5a")
    # door neon bar + lamp
    cv.rect(52, 57, 68, 60, "#241a42"); cv.hline(53, 67, 58, "#5fe0f0"); cv.hline(53, 67, 59, "#2a9cb0")
    # side vertical GAMES sign
    cv.rect(108, 50, 116, 86, "#241a42"); cv.vline(108, 50, 86, "#ff6ad5"); cv.vline(116, 50, 86, "#ff6ad5")
    cv.hline(108, 116, 50, "#ff6ad5"); cv.hline(108, 116, 86, "#ff6ad5")
    text(cv, "GAMES", 111, 54, "#fff0fb", vertical=True)
    # bushes & flowers
    for bx in (9, 108):
        bush(cv, bx, 90, 14, 14)
        flowers(cv, bx - 4, 88, ["#c9a0f0", "#ff8fe0", "#ffffff"], n=4, seed=bx)
    # chalkboard
    cv.vline(30, 100, 104, "#7a5a3a"); cv.rect(24, 92, 38, 103, "#7a5a3a"); cv.rect(25, 93, 37, 101, "#3a3340")
    for y in (95, 97, 99):
        cv.hline(27, 35, y, "#e8e0f0")
    # mat
    cv.rect(52, 104, 68, 106, "#f08aa8")
    cv.rect(10, 104, 110, 108, "#9a8dba"); cv.hline(10, 110, 104, "#c8bee0")
    for x in range(14, 110, 12):
        cv.vline(x, 105, 108, "#7e72a0")
    cv.save("gameroom.png")


# ---------------------------------------------------------------- Bus stop
def bus_stop():
    cv = Cv(128, 112)
    # back wall of shelter
    cv.rect(24, 40, 96, 96, "#f0dcc6")
    for y in range(44, 96, 5):
        cv.hline(24, 96, y, "#e2c8ae")
    cv.rect(24, 40, 96, 46, "#cfae92")
    # poster
    cv.box(40, 52, 72, 78, "#fff4e6", "#a8785a")
    cv.rect(42, 54, 70, 76, "#fde0e6")
    for dx, dy in ((50, 60), (58, 60)):
        cv.disc(dx, dy, 3, "#e0607e")
    for i in range(7):
        cv.hline(47 + i, 61 - i + 5, 66 + i, "#e0607e") if False else None
    for r, w in enumerate((13, 11, 9, 7, 5, 3, 1)):
        cv.hline(56 - w // 2, 56 + w // 2, 62 + r, "#e0607e")
    cv.hline(46, 66, 72, "#cfae92"); cv.hline(48, 64, 74, "#cfae92")
    # bench
    cv.rect(30, 78, 90, 82, "#8a5a3a"); cv.hline(30, 90, 78, "#b07a50"); cv.hline(30, 90, 80, "#6e4529")
    cv.rect(30, 84, 90, 87, "#7a4e30")
    cv.rect(32, 87, 35, 96, "#5e3a22"); cv.rect(85, 87, 88, 96, "#5e3a22")
    # roof (front gable, low pitch)
    gable_roof(cv, 6, 114, 40, 8, "#d8707f", "#a8455e", "#f09aa6", rows=3)
    cv.rect(4, 38, 116, 43, "#a8455e"); cv.hline(4, 116, 39, "#d8707f")
    # heart/bus emblem in gable
    cv.disc(60, 26, 6, "#fff0e6"); cv.disc(60, 26, 4, "#f4a8bc")
    cv.rect(57, 24, 63, 28, "#fff0e6"); cv.hline(58, 62, 25, "#e0607e"); cv.px(58, 28, "#a8455e"); cv.px(62, 28, "#a8455e")
    # posts
    for px0 in (12, 96):
        cv.rect(px0, 43, px0 + 8, 98, "#f4e6d0")
        cv.vline(px0, 43, 98, "#cdb89a"); cv.vline(px0 + 8, 43, 98, "#cdb89a")
        cv.rect(px0 - 1, 94, px0 + 9, 99, "#cdb89a")
        cv.rect(px0 - 1, 43, px0 + 9, 45, "#cdb89a")
    # hanging basket
    cv.hline(14, 20, 50, "#6a5a4a"); cv.rect(12, 52, 22, 58, "#8a5a3a")
    flowers(cv, 11, 47, ["#f08aa8", "#ffffff", "#e0607e"], n=4, seed=2)
    for x in (13, 16, 19):
        cv.px(x, 59, "#4f8f4f"); cv.px(x, 60, "#3c6e3c")
    # planter right
    cv.rect(98, 86, 112, 100, "#b66a52"); cv.rect(97, 84, 113, 87, "#d68a6e")
    bush(cv, 105, 76, 16, 10)
    flowers(cv, 99, 76, ["#f08aa8", "#e0607e", "#ffffff"], n=6, seed=4)
    # left planter
    cv.rect(8, 88, 20, 100, "#b66a52"); cv.rect(7, 86, 21, 89, "#d68a6e")
    bush(cv, 14, 80, 14, 9)
    flowers(cv, 9, 79, ["#f08aa8", "#ffffff"], n=4, seed=6)
    # sign pole + round bus sign
    cv.rect(118, 36, 120, 104, "#7a7a8a"); cv.vline(118, 36, 104, "#a8a8b8")
    cv.disc(119, 24, 10, "#fff0e6"); cv.disc(119, 24, 8, "#e0607e")
    cv.rect(113, 19, 125, 28, "#fff0e6")
    cv.rect(114, 20, 124, 24, "#ffffff"); cv.hline(114, 124, 22, "#9ad0f0"); cv.hline(114, 124, 21, "#9ad0f0")
    cv.hline(114, 124, 26, "#e0607e"); cv.px(116, 28, "#3b2c45"); cv.px(122, 28, "#3b2c45")
    cv.px(115, 24, "#f2cf5a"); cv.px(123, 24, "#f2cf5a")
    # pavers
    cv.rect(6, 100, 112, 108, "#c8b8a8"); cv.hline(6, 112, 100, "#e2d6c8")
    for i, y in enumerate((103, 106)):
        cv.hline(6, 112, y, "#a89888")
        for x in range(8 + (i % 2) * 6, 112, 12):
            cv.vline(x, y + 1, y + 2, "#a89888")
    cv.save("busstop.png")


# ---------------------------------------------------------------- Seed stall (front view)
def seed_shop():
    cv = Cv(120, 112)
    # posts
    for x in (12, 100):
        cv.rect(x, 30, x + 7, 100, "#8a5a32"); cv.vline(x, 30, 100, "#a8743c"); cv.vline(x + 7, 30, 100, "#5e3a22")
    # back panel
    planks(cv, 20, 34, 99, 70, "#a8743c", "#8a5a32", step=5)
    # striped awning (flat front, scalloped hem)
    for x in range(6, 114):
        stripe = ((x - 6) // 6) % 2 == 0
        top = 10 + (0 if stripe else 0)
        cv.rect(x, top, x, 30, "#4f9a5a" if stripe else "#f6ecc8")
        hem = 33 if (x % 6) in (1, 2, 3, 4) else 31
        for y in range(31, hem + 1):
            cv.px(x, y, "#3f7a48" if stripe else "#e0d3a8")
    cv.hline(6, 113, 9, "#3f7a48"); cv.hline(6, 113, 10, "#6fba78")
    cv.hline(6, 113, 22, "#00000000") if False else None
    # hanging lantern
    cv.vline(60, 34, 38, "#3b2c45"); cv.rect(57, 38, 63, 46, "#3b2c45"); cv.rect(58, 39, 62, 45, "#ffd36a")
    # hanging sign right
    cv.vline(104, 34, 38, "#3b2c45"); cv.vline(116, 34, 38, "#3b2c45"); cv.hline(104, 116, 34, "#3b2c45")
    cv.box(101, 38, 119, 52, "#8a5a32", "#3b2c45"); text(cv, "SEEDS", 105, 43, "#f6e2a8") if False else None
    text(cv, "SEED", 103, 40, "#f6e2a8")
    cv.px(110, 49, "#7ad07a"); cv.px(109, 48, "#7ad07a"); cv.px(111, 48, "#7ad07a"); cv.vline(110, 50, 51, "#4f9a5a")
    # display shelf (front-on, tiers of packets)
    cv.rect(22, 50, 98, 86, "#6e4529")
    cv.rect(24, 52, 96, 84, "#8a5a32")
    cols = ["#f2d65a", "#f08a6a", "#9ad07a", "#c9a0f0", "#7ac0f0", "#f4a8bc"]
    for tier, y in enumerate((54, 66)):
        for i in range(9):
            x = 26 + i * 8
            c = cols[(i + tier * 2) % len(cols)]
            cv.rect(x, y, x + 6, y + 10, "#f6ecc8"); cv.rect(x, y, x + 6, y, "#d8c898")
            cv.rect(x + 1, y + 2, x + 5, y + 6, c); cv.px(x + 3, y + 8, "#4f9a5a")
        cv.rect(24, y + 11, 96, y + 12, "#5e3a22")
    # counter
    cv.rect(10, 84, 110, 90, "#b88050"); cv.hline(10, 110, 84, "#d8a070"); cv.hline(10, 110, 90, "#5e3a22")
    planks(cv, 12, 91, 108, 100, "#9a6a3c", "#7a4e2a", step=8)
    cv.hline(12, 108, 100, "#5e3a22")
    # crates left / right with seed packets
    for cx0 in (2, 94):
        cv.rect(cx0, 90, cx0 + 24, 106, "#a8743c"); cv.hline(cx0, cx0 + 24, 90, "#d8a070")
        cv.hline(cx0 + 1, cx0 + 23, 98, "#6e4529"); cv.vline(cx0 + 12, 91, 105, "#6e4529")
        for i in range(5):
            cv.rect(cx0 + 2 + i * 4, 86, cx0 + 4 + i * 4, 91, cols[(i + cx0) % 6])
    # seedling planter box front center
    cv.rect(34, 92, 86, 106, "#8a5a32"); cv.hline(34, 86, 92, "#b88050"); cv.hline(35, 85, 99, "#5e3a22")
    for i in range(9):
        x = 38 + i * 5
        cv.vline(x, 88, 92, "#4f9a5a"); cv.px(x - 1, 88, "#7ad07a"); cv.px(x + 1, 87, "#7ad07a"); cv.px(x, 87, "#9ad07a")
    # chalkboard left
    cv.rect(1, 56, 17, 82, "#5e3a22"); cv.rect(2, 57, 16, 80, "#3a3340")
    for y in (60, 64, 68, 72):
        cv.hline(4, 14, y, "#e8e0f0")
    cv.px(9, 77, "#7ad07a"); cv.vline(9, 78, 79, "#7ad07a")
    # barrel w/ flowers right
    cv.rect(108, 76, 118, 104, "#8a5a32"); cv.hline(108, 118, 82, "#5e3a22"); cv.hline(108, 118, 96, "#5e3a22")
    bush(cv, 113, 70, 12, 8); flowers(cv, 108, 67, ["#ffffff", "#f4a8bc"], n=4, seed=9)
    cv.rect(6, 104, 114, 108, "#9a8d78"); cv.hline(6, 114, 104, "#c8bca4")
    cv.save("seedshop.png")


# ---------------------------------------------------------------- Pub Freesia (front view)
def pub():
    cv = Cv(132, 112)
    cv.rect(98, 6, 108, 30, "#d8c8b0"); cv.rect(96, 3, 110, 6, "#b8a890")
    gable_roof(cv, 6, 126, 46, 6, "#7c7c98", "#55556e", "#9a9ab6")
    # gable twin windows
    for wx in (50, 70):
        cv.box(wx, 26, wx + 12, 40, "#e8c898", "#55556e")
        cv.rect(wx + 2, 28, wx + 10, 38, "#ffe3a8"); cv.vline(wx + 6, 28, 38, "#55556e"); cv.hline(wx + 2, wx + 10, 33, "#55556e")
    cv.rect(46, 41, 84, 43, "#cdb08a")
    # walls
    planks(cv, 12, 50, 120, 104, "#f4c898", "#e8b27c", step=6)
    for x in (12, 42, 90, 118):
        cv.rect(x, 50, x + 3, 104, "#a8743c"); cv.vline(x, 50, 104, "#c8905c")
    cv.hline(12, 120, 50, "#6e4529"); cv.hline(12, 120, 51, "#c8905c")
    # sign board
    cv.rect(22, 54, 110, 66, "#2f6a48"); cv.rect(22, 54, 110, 54, "#f2cf5a"); cv.rect(22, 66, 110, 66, "#f2cf5a")
    cv.vline(22, 54, 66, "#f2cf5a"); cv.vline(110, 54, 66, "#f2cf5a")
    text(cv, "PUB FREESIA", 44, 57, "#fff6d8")
    cv.px(28, 60, "#7ad07a"); cv.px(27, 61, "#7ad07a"); cv.px(29, 61, "#7ad07a"); cv.px(28, 62, "#7ad07a")
    cv.px(104, 60, "#7ad07a"); cv.px(103, 61, "#7ad07a"); cv.px(105, 61, "#7ad07a"); cv.px(104, 62, "#7ad07a")
    # windows
    for wx in (20, 86):
        cv.box(wx, 72, wx + 22, 96, "#6e4529", "#3b2c45")
        cv.rect(wx + 2, 74, wx + 20, 94, "#ffd78a"); cv.hline(wx + 2, wx + 20, 75, "#fff0c0")
        cv.vline(wx + 11, 74, 94, "#6e4529"); cv.hline(wx + 2, wx + 20, 84, "#6e4529")
        cv.rect(wx + 4, 86, wx + 8, 92, "#7a4a6a"); cv.rect(wx + 14, 88, wx + 18, 92, "#7a4a6a")  # silhouettes
        cv.rect(wx - 2, 96, wx + 24, 100, "#6e4529")
        flowers(cv, wx, 93, ["#f08aa8", "#ffffff", "#c9a0f0"], n=7, seed=wx)
    # double door
    cv.box(52, 68, 80, 104, "#2f6a48", "#1f4a30")
    cv.rect(54, 70, 78, 86, "#ffd78a"); cv.vline(66, 70, 86, "#2f6a48"); cv.hline(54, 78, 78, "#2f6a48")
    cv.rect(54, 88, 65, 102, "#3a8058"); cv.rect(67, 88, 78, 102, "#3a8058")
    cv.hline(54, 78, 94, "#2f6a48"); cv.px(64, 94, "#f2cf5a"); cv.px(68, 94, "#f2cf5a")
    # lanterns
    for lx in (46, 86):
        cv.vline(lx, 66, 69, "#3b2c45"); cv.rect(lx - 2, 69, lx + 2, 75, "#3b2c45"); cv.rect(lx - 1, 70, lx + 1, 74, "#ffd36a")
    # hanging pub sign (left)
    cv.hline(2, 12, 70, "#3b2c45"); cv.vline(8, 71, 74, "#3b2c45")
    cv.box(2, 74, 14, 84, "#3b2c45", "#1f1730"); text(cv, "PUB", 3, 77, "#f6e2a8") if False else None
    cv.hline(4, 12, 77, "#f6e2a8"); cv.hline(4, 12, 80, "#f6e2a8")
    # ivy on corners
    for ix in (8, 118):
        for i in range(8):
            cv.px(ix + (i % 3), 48 + i * 3, "#4f9a5a"); cv.px(ix + 1 + (i % 2), 49 + i * 3, "#7cbc6a")
    # steps
    cv.rect(46, 104, 86, 106, "#d8c0a0"); cv.rect(42, 106, 90, 108, "#c8b090")
    cv.rect(8, 104, 124, 108, "#a89d88"); cv.hline(8, 124, 104, "#d0c6b0")
    # barrels / bench
    cv.rect(8, 92, 17, 104, "#8a5a32"); cv.hline(8, 17, 96, "#5e3a22"); cv.hline(8, 17, 100, "#5e3a22")
    bush(cv, 12, 86, 12, 7)
    cv.rect(96, 98, 118, 101, "#8a5a32"); cv.rect(97, 101, 99, 104, "#5e3a22"); cv.rect(115, 101, 117, 104, "#5e3a22")
    cv.save("pub.png")


def scallop_awning(cv, x0, x1, y, h, c1, c2, edge, w=4):
    for x in range(x0, x1 + 1):
        stripe = ((x - x0) // w) % 2 == 0
        c = c1 if stripe else c2
        cv.rect(x, y, x, y + h, c)
        end = y + h + (2 if (x - x0) % w in (1, 2) else 0)
        for yy in range(y + h, end + 1):
            cv.px(x, yy, c)
    cv.hline(x0, x1, y, edge)


# ---------------------------------------------------------------- Bakery (front view)
def bakery():
    cv = Cv(124, 112)
    # chimney (left, brick)
    bricks(cv, 6, 6, 18, 60, "#b0604a", "#8a4636"); cv.rect(4, 4, 20, 8, "#8a4636"); cv.hline(4, 20, 4, "#c8806a")
    # roof strip
    cv.rect(20, 12, 118, 22, "#a8809c"); cv.hline(20, 118, 12, "#c8a4c0")
    for x in range(20, 119, 4):
        cv.vline(x, 14, 21, "#8a6280")
    cv.rect(18, 22, 120, 25, "#7a5a70")
    # upper stone wall
    for y in range(26, 56):
        for x in range(20, 119):
            cv.px(x, y, "#d8c8ae" if ((x // 8 + (y // 6) * 3) % 2) else "#cdbb9e")
    for y in range(31, 56, 6):
        cv.hline(20, 118, y, "#b8a58a")
    # two dark windows
    for wx in (30, 86):
        cv.box(wx, 28, wx + 18, 52, "#6e4a42", "#3b2c45")
        cv.rect(wx + 3, 31, wx + 15, 49, "#8a7a82"); cv.vline(wx + 9, 31, 49, "#6e4a42"); cv.hline(wx + 3, wx + 15, 40, "#6e4a42")
        cv.rect(wx + 4, 32, wx + 8, 38, "#a898a0"); cv.rect(wx + 4, 42, wx + 8, 47, "#a898a0")
    # ivy
    for ix in (22, 112):
        for i in range(12):
            cv.px(ix + (i % 3), 28 + i * 3, "#4f9a5a"); cv.px(ix + 1 + (i % 2), 29 + i * 3, "#7cbc6a")
    # sign board
    cv.rect(20, 56, 118, 70, "#6a3e2a"); cv.hline(20, 118, 56, "#a8683e"); cv.hline(20, 118, 70, "#4a2a1c")
    text(cv, "BAKERY", 46, 60, "#f6c85a"); text(cv, "BAKERY", 46, 61, "#c8903a")
    for x in range(48, 92, 5): pass
    # shopfront
    cv.rect(20, 71, 118, 104, "#8a4a3a")
    for x in (24, 78):
        cv.box(x, 74, x + 34, 100, "#4a2a1c", "#2a1a14")
        cv.rect(x + 2, 76, x + 32, 98, "#ffd890"); cv.hline(x + 2, x + 32, 77, "#fff0c0")
        cv.rect(x + 2, 90, x + 32, 91, "#8a5a32")
        for i in range(4):
            cv.rect(x + 4 + i * 8, 84, x + 9 + i * 8, 89, "#d8a050" if i % 2 else "#e8b868"); cv.px(x + 6 + i * 8, 85, "#f6e0a0")
        for i in range(3):
            cv.rect(x + 5 + i * 10, 78, x + 10 + i * 10, 82, "#c88a40")
    # door
    cv.box(60, 74, 76, 104, "#5a2e22", "#2a1a14")
    cv.rect(62, 76, 74, 90, "#f6c880"); cv.hline(62, 74, 83, "#5a2e22"); cv.vline(68, 76, 90, "#5a2e22")
    cv.rect(62, 92, 74, 102, "#6e3a2a"); cv.px(72, 96, "#f2cf5a")
    cv.rect(62, 69, 74, 71, "#f6e2a8"); text(cv, "OPEN", 62, 69, "#6a3e2a") if False else None
    # brick base planters
    for x in (22, 98):
        bricks(cv, x, 96, x + 18, 106, "#a85a44", "#8a4636")
    # chalkboard
    cv.rect(2, 88, 16, 106, "#7a5a3a"); cv.rect(3, 89, 15, 104, "#3a3340")
    for y in (92, 95, 98): cv.hline(5, 13, y, "#e8e0f0")
    cv.rect(2, 106, 120, 109, "#9a8d78"); cv.hline(2, 120, 106, "#c8bca4")
    cv.save("bakery.png")


# ---------------------------------------------------------------- Flower shop (front view)
def flower_shop():
    cv = Cv(92, 132)
    gable_roof(cv, 6, 86, 40, 6, "#7a5a52", "#523a36", "#95766c", rows=3)
    cv.rect(38, 18, 54, 34, "#f6efe4"); cv.disc(46, 26, 6, "#523a36"); cv.disc(46, 26, 4, "#d8b8c8")
    cv.vline(46, 22, 30, "#523a36"); cv.hline(42, 50, 26, "#523a36")
    bricks(cv, 10, 42, 82, 96, "#f6efe4", "#e4d8c8")
    cv.rect(10, 42, 12, 96, "#dccfbc"); cv.rect(80, 42, 82, 96, "#dccfbc")
    # garland
    for x in range(10, 83):
        cv.px(x, 50 + int(2 * abs(((x - 10) % 12) - 6) / 6), "#4f9a5a")
    for i, x in enumerate(range(14, 82, 6)):
        cv.px(x, 52, ["#f08aa8", "#ffffff", "#f2cf5a"][i % 3]); cv.px(x + 1, 53, "#f08aa8")
    # sign
    cv.rect(14, 56, 78, 66, "#6a3e2a"); cv.hline(14, 78, 56, "#a8683e"); cv.hline(14, 78, 66, "#4a2a1c")
    text(cv, "FLOWER SHOP", 17, 59, "#f6c85a")
    # awning
    scallop_awning(cv, 36, 80, 68, 5, "#a8809c", "#cdb4c8", "#7a5a70")
    # window with flowers
    cv.box(38, 77, 78, 98, "#6a4a3a", "#3b2c45")
    cv.rect(40, 79, 76, 96, "#d8e8e4"); cv.hline(40, 76, 80, "#f0f8f4")
    cv.vline(58, 79, 96, "#6a4a3a")
    text(cv, "FLOWER", 44, 83, "#b8c8c4")
    for x, c in ((44, "#f08aa8"), (52, "#c9a0f0"), (64, "#f2cf5a"), (70, "#f08aa8")):
        cv.rect(x, 88, x + 5, 96, "#8a6a4a"); cv.rect(x - 1, 83, x + 6, 88, c) if False else None
    flowers(cv, 42, 90, ["#f08aa8", "#c9a0f0", "#f2cf5a", "#ffffff"], n=11, seed=11)
    # door
    cv.box(14, 70, 32, 106, "#7a4a3a", "#3b2c45")
    cv.rect(16, 72, 30, 86, "#c8d8d4"); cv.hline(16, 30, 79, "#7a4a3a"); cv.vline(23, 72, 86, "#7a4a3a")
    cv.rect(16, 88, 30, 104, "#8a5a46"); cv.hline(16, 30, 96, "#6a3e2e"); cv.px(28, 95, "#f2cf5a")
    cv.rect(18, 66, 28, 70, "#f6efe4"); cv.hline(19, 27, 68, "#c8a090")
    # steps + balustrade
    cv.rect(8, 106, 84, 110, "#e4dccc"); cv.hline(8, 84, 106, "#ffffff"); cv.rect(4, 110, 88, 114, "#cfc4b2")
    for x in range(36, 82, 4):
        cv.rect(x, 98, x + 1, 106, "#f6efe4"); cv.px(x, 100, "#cfc4b2")
    cv.hline(36, 80, 97, "#f6efe4"); cv.hline(36, 80, 98, "#cfc4b2")
    # pots and cat
    cv.rect(2, 98, 9, 108, "#b66a52"); bush(cv, 6, 92, 10, 7); flowers(cv, 2, 90, ["#f08aa8", "#ffffff"], n=3, seed=3)
    cv.rect(82, 100, 88, 108, "#b66a52"); flowers(cv, 82, 94, ["#c9a0f0", "#f2cf5a"], n=3, seed=4)
    cv.rect(33, 96, 37, 105, "#d8903a"); cv.rect(33, 93, 36, 96, "#e8a850"); cv.px(33, 92, "#e8a850"); cv.px(36, 92, "#e8a850")
    cv.save("flower.png")


# ---------------------------------------------------------------- Cafe (front view)
def cafe():
    cv = Cv(80, 120)
    bricks(cv, 6, 10, 74, 52, "#9a5a4a", "#7a4236")
    cv.rect(4, 6, 76, 10, "#5a3a32"); cv.hline(4, 76, 6, "#8a5a4a")
    # blank board
    cv.rect(14, 14, 66, 36, "#2a2630"); cv.rect(14, 14, 66, 14, "#5a3a32"); cv.rect(14, 36, 66, 36, "#5a3a32")
    cv.vline(14, 14, 36, "#5a3a32"); cv.vline(66, 14, 36, "#5a3a32")
    text(cv, "CAFE", 32, 22, "#f6e2a8")
    cv.px(26, 25, "#f6e2a8"); cv.px(54, 25, "#f6e2a8")
    # upper window
    cv.box(30, 40, 50, 50, "#3a2c34", "#1a1218"); cv.rect(32, 42, 48, 48, "#ffd890"); cv.vline(40, 42, 48, "#3a2c34")
    # ivy
    for i in range(14):
        cv.px(8 + (i % 3), 12 + i * 3, "#4f9a5a"); cv.px(9 + (i % 2), 13 + i * 3, "#7cbc6a")
    # sign strip
    cv.rect(6, 54, 74, 64, "#2a2630"); cv.hline(6, 74, 54, "#5a3a32"); cv.hline(6, 74, 64, "#5a3a32")
    text(cv, "CAFE", 32, 57, "#f6c85a")
    for x in range(8, 72, 6):
        cv.px(x, 66, "#4f9a5a"); cv.px(x + 1, 67, "#7cbc6a"); cv.px(x + 3, 66, "#4f9a5a")
    # ground floor
    cv.rect(6, 65, 74, 106, "#7a4236")
    cv.box(10, 70, 36, 100, "#3a2c34", "#1a1218")
    cv.rect(12, 72, 34, 98, "#ffd890"); cv.hline(12, 34, 73, "#fff0c0")
    cv.rect(14, 76, 32, 86, "#f0e0c0"); cv.hline(14, 32, 76, "#c8a878")
    cv.rect(16, 80, 20, 86, "#a8743c"); cv.rect(26, 82, 30, 86, "#a8743c"); cv.rect(15, 72, 33, 74, "#6a4a3a")
    cv.rect(12, 90, 34, 98, "#5a8a4a"); flowers(cv, 14, 86, ["#f08aa8", "#ffffff"], n=6, seed=8)
    cv.box(44, 68, 68, 106, "#3a2c34", "#1a1218")
    cv.rect(46, 70, 66, 90, "#ffd890"); cv.hline(46, 66, 80, "#3a2c34"); cv.vline(56, 70, 90, "#3a2c34")
    cv.rect(46, 92, 66, 104, "#5a3a2c"); cv.px(64, 98, "#f2cf5a")
    cv.rect(2, 100, 8, 108, "#b66a52"); bush(cv, 5, 94, 8, 6)
    cv.rect(70, 98, 78, 108, "#b66a52"); bush(cv, 74, 92, 10, 7)
    cv.rect(6, 106, 74, 110, "#9a8d78"); cv.hline(6, 74, 106, "#c8bca4")
    cv.save("cafe.png")


# ---------------------------------------------------------------- Evening Cakery (front view)
def cakery():
    cv = Cv(96, 132)
    cv.rect(8, 4, 88, 40, "#5a3a3a")
    for y in range(6, 40, 4):
        cv.hline(8, 88, y, "#6e4646")
    for x in range(10, 88, 8):
        cv.vline(x, 5, 39, "#4a2e2e")
    cv.rect(6, 2, 90, 5, "#cdbfa8"); cv.hline(6, 90, 2, "#f0e4d0")
    # dormer
    cv.rect(38, 18, 58, 40, "#cdbfa8"); cv.box(41, 22, 55, 38, "#7a6a9a", "#3b2c45")
    cv.rect(43, 24, 53, 36, "#c8b8f0"); cv.vline(48, 24, 36, "#7a6a9a"); cv.hline(43, 53, 30, "#7a6a9a")
    # cornice
    cv.rect(6, 40, 90, 46, "#e4d8c4"); cv.hline(6, 90, 40, "#ffffff")
    for x in range(8, 90, 4):
        cv.rect(x, 43, x + 1, 45, "#b8a890")
    # stone corner quoins
    for y in range(46, 108, 8):
        cv.rect(6, y, 13, y + 6, "#e4d8c4"); cv.rect(83, y, 90, y + 6, "#e4d8c4")
        cv.hline(6, 13, y + 6, "#b8a890"); cv.hline(83, 90, y + 6, "#b8a890")
    cv.rect(14, 46, 82, 108, "#f6d8a8")
    for y in range(50, 108, 6):
        cv.hline(14, 82, y, "#e8c690")
    # arched windows
    for wx in (20, 41, 62):
        cv.rect(wx - 2, 50, wx + 14, 70, "#e4d8c4")
        cv.rect(wx, 54, wx + 12, 70, "#6a5a9a")
        cv.disc(wx + 6, 54, 6, "#6a5a9a")
        cv.rect(wx + 2, 56, wx + 10, 69, "#a898e0"); cv.disc(wx + 6, 56, 4, "#a898e0")
        cv.vline(wx + 6, 52, 69, "#6a5a9a"); cv.hline(wx + 2, wx + 10, 62, "#6a5a9a")
        cv.rect(wx - 2, 70, wx + 14, 73, "#8a5a3a")
        flowers(cv, wx, 67, ["#f08aa8", "#c9a0f0", "#ffffff"], n=5, seed=wx)
    # sign
    cv.rect(14, 76, 82, 86, "#8a9ad8"); cv.hline(14, 82, 76, "#d0d8f8"); cv.hline(14, 82, 86, "#5a6aa8")
    text(cv, "EVENING CAKERY", 17, 79, "#fff8e8")
    # shop window with cakes
    cv.box(16, 88, 62, 110, "#e4d8c4", "#8a7a68")
    cv.rect(18, 90, 60, 108, "#ffe0a8"); cv.hline(18, 60, 91, "#fff4d0")
    cv.rect(18, 102, 60, 108, "#c8a878")
    for cx, c in ((24, "#f4a8bc"), (38, "#8a5a3a"), (52, "#f6e0a0")):
        cv.rect(cx, 96, cx + 8, 102, c); cv.rect(cx, 94, cx + 8, 95, "#fff0f0"); cv.px(cx + 4, 93, "#e0405a")
    cv.px(24, 93, "#e0405a") if False else None
    scallop_awning(cv, 62, 82, 88, 3, "#f08aa8", "#fff0e6", "#c25f80", w=3)
    # door
    cv.box(64, 94, 80, 118, "#8a9ad8", "#3b2c45")
    cv.rect(66, 96, 78, 108, "#d8e0ff"); cv.hline(66, 78, 102, "#8a9ad8"); cv.rect(66, 110, 78, 116, "#7a8ac8"); cv.px(76, 104, "#f2cf5a")
    cv.rect(68, 111, 76, 113, "#fff8e8")
    cv.rect(4, 110, 92, 114, "#cfc4b2"); cv.hline(4, 92, 110, "#f0e8d8"); cv.rect(2, 114, 94, 118, "#b8ac98")
    cv.save("cake.png")


# ---------------------------------------------------------------- Home (front view, mossy roof)
def home():
    cv = Cv(128, 104)
    # chimney
    cv.rect(58, 4, 68, 14, "#6a6a72"); cv.rect(56, 2, 70, 5, "#4a4a52")
    # mossy roof
    cx = 64
    for y in range(8, 58):
        t = (y - 8) / 50
        half = int(3 + t * 58)
        for x in range(cx - half, cx + half + 1):
            n = (x * 7 + y * 13) % 11
            c = "#4a8a44" if n < 5 else ("#5aa050" if n < 8 else ("#3a7a3c" if n < 10 else "#7cbc6a"))
            if y % 5 == 4: c = "#3a7a3c"
            cv.px(x, y, c)
        cv.px(cx - half, y, "#2e5e34"); cv.px(cx + half, y, "#2e5e34")
    # vine down the middle + timber trim
    for y in range(8, 58):
        t = (y - 8) / 50; half = int(3 + t * 58)
        for k in (-1, 0, 1): pass
        cv.px(cx - half + 1, y, "#a8743c"); cv.px(cx + half - 1, y, "#a8743c")
    for y in range(10, 58, 3):
        cv.px(cx, y, "#2e6a3a"); cv.px(cx + (1 if y % 2 else -1), y + 1, "#7cbc6a")
    # lower cream gable wall
    for y in range(56, 96):
        half = 40
        for x in range(cx - half, cx + half + 1):
            cv.px(x, y, "#f0e2c0" if (x // 4) % 2 else "#e6d4ae")
    cv.hline(cx - 41, cx + 41, 56, "#a8743c"); cv.rect(cx - 44, 55, cx + 44, 57, "#7a5230")
    # timber frame diagonals
    for i in range(10):
        cv.px(cx - 38 + i, 58 + i, "#a8743c"); cv.px(cx + 38 - i, 58 + i, "#a8743c")
    # round door
    cv.rect(53, 70, 75, 96, "#7a4a2a"); cv.disc(64, 72, 11, "#7a4a2a"); cv.disc(64, 72, 9, "#a8683e")
    cv.rect(55, 72, 73, 96, "#a8683e")
    for x in (58, 64, 70): cv.vline(x, 64, 95, "#7a4a2a")
    cv.px(70, 84, "#f2cf5a"); cv.px(70, 85, "#f2cf5a")
    # windows
    for wx in (22, 92):
        cv.disc(wx + 7, 72, 7, "#7a4a2a"); cv.disc(wx + 7, 72, 5, "#ffd890")
        cv.vline(wx + 7, 67, 77, "#7a4a2a"); cv.hline(wx + 2, wx + 12, 72, "#7a4a2a")
    # attic window
    cv.disc(64, 50, 5, "#f0e2c0"); cv.disc(64, 50, 3, "#ffd890"); cv.vline(64, 47, 53, "#7a4a2a")
    # planters, flowers
    for px0 in (16, 98):
        cv.rect(px0, 90, px0 + 14, 98, "#8a5a32"); cv.hline(px0, px0 + 14, 90, "#b88050")
        bush(cv, px0 + 7, 84, 14, 7); flowers(cv, px0 + 1, 82, ["#f08aa8", "#ffffff", "#f2cf5a"], n=5, seed=px0)
    cv.rect(44, 96, 84, 99, "#cfc4b2")
    cv.rect(6, 98, 122, 102, "#9a9078"); cv.hline(6, 122, 98, "#c8bea4")
    cv.save("home.png")


if __name__ == "__main__":
    # Only the buildings without supplied art are generated; pub, bakery, flower shop, groceries,
    # home, grass house and arcade use art from the artist and must not be overwritten.
    pet_decor(); bus_stop(); cafe(); cakery()
    print("ok")
