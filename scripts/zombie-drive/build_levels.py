#!/usr/bin/env python3
"""Build Zombie Drive level files from OpenStreetMap.

Downloads each level area from Overpass (cached), then writes a compact JSON with
buildings, streets, areas and trees into static/data/zombie-drive.

    python3 scripts/zombie-drive/build_levels.py --cache /tmp/zd-osm

Map data (c) OpenStreetMap contributors, ODbL.
"""
import argparse
import json
import math
import os
import re
import urllib.parse
import urllib.request
import zlib

LEVELS = {
    "krakow": dict(bbox=(50.0515, 19.9290, 50.0665, 19.9480), center=(50.0590, 19.9385),
                   start=(50.0617, 19.9373), finish=(50.0543, 19.9355), name="Krakow Old Town", default_h=14),
    "minsk": dict(bbox=(53.8950, 27.5480, 53.9100, 27.5750), center=(53.9025, 27.5615),
                  start=(53.8975, 27.5535), finish=(53.9080, 27.5700), name="Minsk centre", default_h=18),
    "kyiv": dict(bbox=(50.4430, 30.5120, 50.4570, 30.5350), center=(50.4500, 30.5235),
                 start=(50.4460, 30.5210), finish=(50.4503, 30.5245), name="Kyiv, Khreshchatyk", default_h=20),
}

ROAD_W = {"primary": 14, "secondary": 12, "tertiary": 10, "residential": 8, "unclassified": 7, "living_street": 7,
          "pedestrian": 8, "service": 5, "footway": 2.5, "path": 2.2, "cycleway": 2.5, "steps": 2.5,
          "primary_link": 7, "secondary_link": 7, "tertiary_link": 6}
ROAD_RE = "|".join(ROAD_W)
GREEN = {"park": "park", "garden": "garden", "pitch": "pitch", "playground": "grass", "dog_park": "grass",
         "nature_reserve": "forest", "grass": "grass", "meadow": "grass", "forest": "forest", "village_green": "grass",
         "recreation_ground": "grass", "cemetery": "cemetery", "allotments": "garden", "orchard": "garden",
         "flowerbed": "garden", "wood": "forest", "scrub": "grass", "grassland": "grass", "heath": "grass",
         "grave_yard": "cemetery"}
COLOURS = {"white": "#efece4", "grey": "#8d8f91", "gray": "#8d8f91", "red": "#a2452f", "brown": "#6b4a36",
           "yellow": "#d8bf72", "beige": "#d8c7a4", "green": "#4d7a5c", "blue": "#54708f", "black": "#303236",
           "orange": "#c9783c", "pink": "#d5a79c", "tan": "#c9ad85", "maroon": "#6d2c28", "lightgrey": "#c4c5c4",
           "lightgray": "#c4c5c4", "darkgrey": "#585a5c", "darkgray": "#585a5c", "silver": "#b8bcc0",
           "copper": "#6f9c8a", "teal": "#4b8680", "cream": "#e8dcc0", "ivory": "#ece6d2", "terracotta": "#b05a3c"}


def overpass_query(b):
    box = f"{b[0]},{b[1]},{b[2]},{b[3]}"
    def both(selector):
        return f'way{selector}({box});relation{selector}["type"="multipolygon"]({box});'
    return (
        "[out:json][timeout:280];("
        + both('["building"]') + both('["building:part"]')
        + f'way["highway"~"^({ROAD_RE})$"]({box});'
        + both('["leisure"~"^(park|garden|pitch|playground|dog_park|nature_reserve)$"]')
        + both('["landuse"~"^(grass|meadow|forest|village_green|recreation_ground|cemetery|allotments|orchard|flowerbed|basin|reservoir)$"]')
        + both('["natural"~"^(water|wood|scrub|grassland|heath)$"]')
        + both('["amenity"~"^(parking|grave_yard)$"]')
        + both('["place"="square"]')
        + f'way["waterway"="riverbank"]({box});way["natural"="tree_row"]({box});node["natural"="tree"]({box});'
        + ");out geom;"
    )


def fetch(key, cfg, cache):
    path = os.path.join(cache, key + ".json")
    if not os.path.exists(path):
        os.makedirs(cache, exist_ok=True)
        body = urllib.parse.urlencode({"data": overpass_query(cfg["bbox"])}).encode()
        req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=body,
                                     headers={"User-Agent": "zombie-drive-level-builder/1.0"})
        with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
            f.write(r.read())
    with open(path) as f:
        return json.load(f)


def signed_area(r):
    return sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r))) / 2


def centroid(r):
    return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)


def inside(pt, r):
    x, y = pt
    hit = False
    for i in range(len(r)):
        x0, y0 = r[i]
        x1, y1 = r[(i + 1) % len(r)]
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            hit = not hit
    return hit


def clip_rect(ring, rect):
    """Sutherland-Hodgman against the level rectangle."""
    xmin, ymin, xmax, ymax = rect
    planes = [(lambda p: p[0] >= xmin, 0, xmin), (lambda p: p[0] <= xmax, 0, xmax),
              (lambda p: p[1] >= ymin, 1, ymin), (lambda p: p[1] <= ymax, 1, ymax)]
    out = ring
    for keep, axis, value in planes:
        src, out = out, []
        for i, cur in enumerate(src):
            prev = src[i - 1]
            if keep(cur) != keep(prev):
                t = (value - prev[axis]) / (cur[axis] - prev[axis])
                out.append((round(prev[0] + (cur[0] - prev[0]) * t, 1), round(prev[1] + (cur[1] - prev[1]) * t, 1)))
            if keep(cur):
                out.append(cur)
        if not out:
            return []
    return out


def dedupe(ring):
    out = []
    for p in ring:
        if not out or p != out[-1]:
            out.append(p)
    if len(out) > 1 and out[0] == out[-1]:
        out.pop()
    return out


def stitch(lines):
    """Join open member ways of a multipolygon into closed rings."""
    lines = [list(l) for l in lines if len(l) > 1]
    rings = []
    while lines:
        cur = lines.pop()
        grown = True
        while grown and cur[0] != cur[-1]:
            grown = False
            for i, l in enumerate(lines):
                if l[0] == cur[-1]:
                    cur += l[1:]
                elif l[-1] == cur[-1]:
                    cur += l[-2::-1]
                elif l[-1] == cur[0]:
                    cur = l[:-1] + cur
                elif l[0] == cur[0]:
                    cur = l[:0:-1] + cur
                else:
                    continue
                lines.pop(i)
                grown = True
                break
        if cur[0] == cur[-1] and len(cur) > 3:
            rings.append(cur)
    return rings


def number(v):
    m = re.match(r"\s*(-?\d+(?:[.,]\d+)?)", str(v or ""))
    return float(m.group(1).replace(",", ".")) if m else None


def colour(v):
    if not v:
        return None
    v = v.strip().lower()
    if re.fullmatch(r"#[0-9a-f]{6}", v):
        return v
    if re.fullmatch(r"#[0-9a-f]{3}", v):
        return "#" + "".join(c * 2 for c in v[1:])
    return COLOURS.get(v)


def polygons_of(e, loc):
    """Return [(outer, [holes])] in local metres."""
    if e["type"] == "way":
        pts = [loc(p["lat"], p["lon"]) for p in e.get("geometry", [])]
        return [(pts, [])] if len(pts) > 3 and pts[0] == pts[-1] else []
    outers, inners = [], []
    for m in e.get("members", []):
        if m.get("type") != "way" or "geometry" not in m:
            continue
        line = [loc(p["lat"], p["lon"]) for p in m["geometry"] if p]
        (inners if m.get("role") == "inner" else outers).append(line)
    res = [(o, []) for o in stitch(outers)]
    for hole in stitch(inners):
        c = hole[0]
        for o, holes in res:
            if inside(c, o):
                holes.append(hole)
                break
    return res


def building_class(t):
    b = t.get("building", t.get("building:part", "yes"))
    if b in ("church", "cathedral", "chapel", "synagogue", "mosque", "temple", "basilica") or t.get("amenity") == "place_of_worship":
        return "c"
    if b in ("commercial", "office", "retail", "hotel", "supermarket", "mall", "kiosk") or "shop" in t or "office" in t:
        return "o"
    if b in ("civic", "public", "government", "university", "school", "college", "museum", "theatre", "train_station", "palace", "castle"):
        return "p"
    return "r"


def convert_building(e, t, outer, holes, cfg):
    levels = number(t.get("building:levels"))
    height = number(t.get("height"))
    roof_h = number(t.get("roof:height"))
    roof_levels = number(t.get("roof:levels"))
    if roof_h is None and roof_levels:
        roof_h = roof_levels * 2.6
    if height is None and levels is not None:
        height = levels * 3.3 + 1.2 + (roof_h or 0)
    if height is None:
        height = cfg["default_h"] + (zlib.crc32(str(e["id"]).encode()) % 7) - 3
    min_h = number(t.get("min_height"))
    if min_h is None and number(t.get("building:min_level")) is not None:
        min_h = number(t.get("building:min_level")) * 3.3
    b = {"p": outer, "h": round(max(2.8, min(height, 240.0)), 1), "k": building_class(t)}
    if holes:
        b["ho"] = holes
    if min_h:
        b["mh"] = round(min_h, 1)
    if t.get("roof:shape"):
        b["rs"] = t["roof:shape"]
    if roof_h:
        b["rh"] = round(roof_h, 1)
    rc = colour(t.get("roof:colour")) or {"copper": "#6f9c8a", "roof_tiles": "#a4553c", "tile": "#a4553c", "slate": "#54585e"}.get(t.get("roof:material"))
    if rc:
        b["rc"] = rc
    wc = colour(t.get("building:colour"))
    if wc:
        b["c"] = wc
    if t.get("building:material") == "brick":
        b["br"] = 1
    if "building:part" in t and "building" not in t:
        b["part"] = 1
    if t.get("name"):
        b["n"] = t["name"][:40]
    return b


def area_kind(t):
    if t.get("natural") == "water" or t.get("landuse") in ("basin", "reservoir") or t.get("waterway") == "riverbank":
        return "water"
    if t.get("amenity") == "parking":
        return "parking"
    if t.get("place") == "square" or (t.get("highway") and t.get("area") == "yes"):
        return "square"
    for key in ("leisure", "landuse", "natural", "amenity"):
        if t.get(key) in GREEN:
            return GREEN[t[key]]
    return None


def convert(key, cfg, raw):
    lat0, lon0 = cfg["center"]
    kx = 111320 * math.cos(math.radians(lat0))
    ky = 110540
    def loc(lat, lon):
        return (round((lon - lon0) * kx, 1), round((lat - lat0) * ky, 1))
    s, w, n, e_ = cfg["bbox"]
    x0, y0 = loc(s, w)
    x1, y1 = loc(n, e_)
    rect = (x0, y0, x1, y1)

    buildings, areas, roads, trees, rows = [], [], [], [], []
    for e in raw["elements"]:
        t = e.get("tags", {})
        if e["type"] == "node":
            p = loc(e["lat"], e["lon"])
            if x0 < p[0] < x1 and y0 < p[1] < y1:
                trees.append(p)
            continue
        if "building" in t or "building:part" in t:
            if t.get("building") in ("no", "roof", "ruins") or t.get("building:part") == "no":
                continue
            for outer, holes in polygons_of(e, loc):
                outer = dedupe(outer)
                holes = [dedupe(h) for h in holes if len(dedupe(h)) >= 3]
                c = centroid(outer)
                if len(outer) >= 3 and x0 < c[0] < x1 and y0 < c[1] < y1:
                    buildings.append(convert_building(e, t, outer, holes, cfg))
            continue
        kind = area_kind(t)
        if kind:
            for outer, holes in polygons_of(e, loc):
                o = dedupe(clip_rect(dedupe(outer), rect))
                if len(o) < 3 or abs(signed_area(o)) < 8:
                    continue
                a = {"k": kind, "p": o}
                hs = [dedupe(clip_rect(dedupe(h), rect)) for h in holes]
                hs = [h for h in hs if len(h) >= 3]
                if hs:
                    a["ho"] = hs
                areas.append(a)
            continue
        if t.get("natural") == "tree_row" and e["type"] == "way":
            rows.append([loc(p["lat"], p["lon"]) for p in e["geometry"]])
            continue
        if "highway" in t and e["type"] == "way":
            if t.get("tunnel") not in (None, "no") or t.get("indoor") == "yes":
                continue
            pts = [loc(p["lat"], p["lon"]) for p in e["geometry"]]
            if not any(x0 <= p[0] <= x1 and y0 <= p[1] <= y1 for p in pts):
                continue
            kind = t["highway"]
            width = number(t.get("width"))
            lanes = number(t.get("lanes"))
            if width is None:
                width = lanes * 3.3 if lanes and kind not in ("footway", "path", "steps", "cycleway") else ROAD_W[kind]
            r = {"p": pts, "w": round(min(max(width, 1.5), 30), 1), "t": kind}
            if t.get("bridge") not in (None, "no"):
                r["b"] = 1
            surface = t.get("surface", "")
            if surface in ("paving_stones", "concrete:plates", "paved", "concrete"):
                r["s"] = "p"
            elif surface in ("sett", "cobblestone", "unhewn_cobblestone", "cobblestone:flattened"):
                r["s"] = "c"
            elif surface in ("gravel", "fine_gravel", "compacted", "dirt", "ground", "unpaved", "pebblestone"):
                r["s"] = "g"
            two_way = t.get("oneway") not in ("yes", "1", "-1")
            if kind in ("primary", "secondary") and two_way:
                r["m"] = 2
            elif kind in ("tertiary", "residential", "unclassified") and two_way:
                r["m"] = 1
            if t.get("sidewalk") == "no":
                r["ns"] = 1
            roads.append(r)

    # Buildings mapped as parts: the outline stays for collision, the parts are what gets drawn.
    parts = [b for b in buildings if b.get("part")]
    for b in buildings:
        if b.get("part"):
            continue
        xs = [p[0] for p in b["p"]]
        ys = [p[1] for p in b["p"]]
        area = abs(signed_area(b["p"]))
        covered = 0
        for p in parts:
            c = centroid(p["p"])
            if min(xs) <= c[0] <= max(xs) and min(ys) <= c[1] <= max(ys) and inside(c, b["p"]):
                covered += abs(signed_area(p["p"]))
                # a tower of a church is still a church, whatever the part itself is tagged
                if p["k"] == "r":
                    p["k"] = b["k"]
                for key in ("c", "rc", "br"):
                    if key in b and key not in p:
                        p[key] = b[key]
        if area > 0 and covered / area > 0.5:
            b["np"] = 1
    for b in parts:
        del b["part"]

    return dict(name=cfg["name"], start=loc(*cfg["start"]), finish=loc(*cfg["finish"]),
                bounds=[round(x0), round(y0), round(x1), round(y1)],
                buildings=buildings, roads=roads, areas=areas, trees=trees, treeRows=rows)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--out", default=os.path.join(here, "..", "..", "static", "data", "zombie-drive"))
    args = ap.parse_args()
    for key, cfg in LEVELS.items():
        level = convert(key, cfg, fetch(key, cfg, args.cache))
        path = os.path.join(args.out, key + ".json")
        with open(path, "w") as f:
            json.dump(level, f, separators=(",", ":"))
        kinds = {}
        for a in level["areas"]:
            kinds[a["k"]] = kinds.get(a["k"], 0) + 1
        print(key, len(level["buildings"]), "buildings,", sum(1 for b in level["buildings"] if b.get("np")), "drawn as parts,",
              len(level["roads"]), "roads,", kinds, len(level["trees"]), "trees,", len(level["treeRows"]), "rows,",
              os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    main()
