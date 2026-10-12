"""Registry of the golf courses covered, on each of two coasts.

The Costa del Sol runs west (Sotogrande) to east (Fuengirola); the Algarve runs
west (Lagos) to east (Castro Marim). Every entry below was verified live
against the club's own public booking engine. Regenerate/verify with
``python -m tools.discover``.
"""
from __future__ import annotations

from .models import ALGARVE, COSTA_DEL_SOL, Course

REGIONS = [COSTA_DEL_SOL, ALGARVE]

# Areas are listed west -> east within each region, so the UI can group results
# geographically.
AREAS_BY_REGION: dict[str, list[str]] = {
    COSTA_DEL_SOL: [
        "Sotogrande / San Roque",
        "Casares / Manilva",
        "Estepona",
        "Benahavís",
        "San Pedro / Nueva Andalucía",
        "Marbella",
        "Mijas / Fuengirola",
        "Inland (Alhaurín)",
    ],
    ALGARVE: [
        "Lagos / Sagres",
        "Portimão / Silves",
        "Albufeira",
        "Vilamoura",
        "Quinta do Lago / Almancil",
        "Tavira / Castro Marim",
    ],
}

# Every area, both coasts, still west -> east within each.
AREAS = [a for region in REGIONS for a in AREAS_BY_REGION[region]]


def _gm(club, course, area, holes, tenant, rt, res=None, corridor=True,
        region=COSTA_DEL_SOL):
    return Course(
        club=club, course=course, area=area, holes=holes, platform="golfmanager",
        tenant=tenant, resource_type=rt, resource=res, corridor=corridor,
        region=region,
    )


def _gmh(club, course, area, holes, tenant, area_id=1, rt=None, res=None,
         region=COSTA_DEL_SOL):
    """A club on the newer eu.golfmanager.com front-end."""
    return Course(
        club=club, course=course, area=area, holes=holes,
        platform="golfmanager-hosted", tenant=tenant, area_id=area_id,
        resource_type=rt, resource=res, region=region,
    )


def _t1(club, course, area, holes, tenant, route, corridor=True):
    return Course(
        club=club, course=course, area=area, holes=holes, platform="teeone",
        tenant=tenant, route=str(route), corridor=corridor,
    )


COSTA_DEL_SOL_COURSES: list[Course] = [
    # --- Sotogrande / San Roque ---------------------------------------------
    _gm("Real Club Valderrama", "", "Sotogrande / San Roque", 18, "valderrama", 1, 1),
    _gm("La Reserva Club Sotogrande", "", "Sotogrande / San Roque", 18, "lareserva", 1),
    _gm("The Alto Club (Almenara)", "", "Sotogrande / San Roque", 18, "almenara", 1),
    _gm("The San Roque Club", "Old Course", "Sotogrande / San Roque", 18, "sanroqueclub", 1),
    _t1("La Cañada Club de Golf", "", "Sotogrande / San Roque", 18, "canada", 151),
    # Members' club: its engine is live but publishes no visitor green fees.
    _gmh("R.C.G. Sotogrande", "", "Sotogrande / San Roque", 18, "golfsotogrande"),
    _t1("La Hacienda (Alcaidesa)", "Links", "Sotogrande / San Roque", 18, "lahaciendagolf", 141),
    _t1("La Hacienda (Alcaidesa)", "Heathland", "Sotogrande / San Roque", 18, "lahaciendagolf", 142),
    _t1("La Hacienda (Alcaidesa)", "Links 9", "Sotogrande / San Roque", 9, "lahaciendagolf", 260),
    _t1("La Hacienda (Alcaidesa)", "Heathland 9", "Sotogrande / San Roque", 9, "lahaciendagolf", 261),

    # --- Casares / Manilva ---------------------------------------------------
    _gm("Finca Cortesín", "", "Casares / Manilva", 18, "fincacortesin", 1),
    _t1("Doña Julia Golf", "", "Casares / Manilva", 18, "donajulia", 25),
    _t1("Doña Julia Golf", "9 holes", "Casares / Manilva", 9, "donajulia", 597),

    # --- Estepona ------------------------------------------------------------
    _gm("Valle Romano Golf", "", "Estepona", 18, "valleromano", 1),
    _gm("Azata Golf", "", "Estepona", 18, "azata", 1),
    _t1("Estepona Golf", "", "Estepona", 18, "esteponagolf", 434),
    _t1("Estepona Golf", "9 holes", "Estepona", 9, "esteponagolf", 461),
    _t1("El Paraíso Golf Club", "Tee 1", "Estepona", 18, "paraiso", 126),
    _t1("El Paraíso Golf Club", "Tee 10", "Estepona", 18, "paraiso", 193),
    _t1("Atalaya Golf", "Old Course", "Estepona", 18, "atalaya", 78),
    _t1("Atalaya Golf", "New Course", "Estepona", 18, "atalaya", 79),
    _t1("Atalaya Golf", "Old 9 (morning)", "Estepona", 9, "atalaya", 224),
    _t1("Atalaya Golf", "Old 9 (afternoon)", "Estepona", 9, "atalaya", 225),

    # --- Benahavís -----------------------------------------------------------
    _gm("Marbella Club Golf Resort", "", "Benahavís", 18, "marbellaclub", 2),
    _gm("El Higueral Golf", "", "Benahavís", 18, "elhigueral", 1),
    _t1("Villa Padierna", "Flamingos", "Benahavís", 18, "villapadierna", 90),
    _t1("Villa Padierna", "Alferini", "Benahavís", 18, "villapadierna", 97),
    _t1("Villa Padierna", "Tramores", "Benahavís", 18, "villapadierna", 98),
    _t1("Los Arqueros Golf", "", "Benahavís", 18, "arqueros", 54),
    _t1("Los Arqueros Golf", "9 holes", "Benahavís", 9, "arqueros", 480),
    _t1("La Quinta Golf", "Tee 1", "Benahavís", 18, "quinta", 53),
    _t1("La Quinta Golf", "Tee 10", "Benahavís", 18, "quinta", 73),
    _t1("La Quinta Golf", "Tee 10 (9)", "Benahavís", 9, "quinta", 185),

    # --- San Pedro / Nueva Andalucía ----------------------------------------
    _t1("Real Club de Golf Guadalmina", "", "San Pedro / Nueva Andalucía", 18, "guadalminagolf", 383),
    _t1("R.C.G. Las Brisas", "", "San Pedro / Nueva Andalucía", 18, "brisas", 42),
    _t1("Los Naranjos Golf Club", "", "San Pedro / Nueva Andalucía", 18, "naranjos", 46),
    _t1("Aloha Golf Club", "", "San Pedro / Nueva Andalucía", 18, "aloha", 326),

    # --- Marbella ------------------------------------------------------------
    # NB: the golfmanager tenant "santaclara" is Santa Clara *Granada* -- the
    # Marbella club is a separate TeeOne tenant.
    _t1("Santa Clara Golf Marbella", "", "Marbella", 18, "santaclaramarbella", 1),
    Course(club="Río Real Golf", course="", area="Marbella", holes=18,
           platform="rioreal", tenant="rioreal"),
    _gm("Cabopino Golf", "", "Marbella", 18, "cabopino", 1),
    _t1("Marbella Golf & Country Club", "Tee 1", "Marbella", 18, "marbella", 77),
    _t1("Marbella Golf & Country Club", "Tee 10 (9)", "Marbella", 9, "marbella", 571),
    _t1("Santa María Golf Club", "", "Marbella", 18, "santamaria", 393),
    _gmh("Greenlife Golf Marbella", "", "Marbella", 9, "greenlife"),

    # --- Mijas / Fuengirola --------------------------------------------------
    _gm("La Cala Resort", "Campo América", "Mijas / Fuengirola", 18, "lacala", 1, 1),
    _gm("La Cala Resort", "Campo Asia", "Mijas / Fuengirola", 18, "lacala", 1, 2),
    _gm("La Cala Resort", "Campo Europa", "Mijas / Fuengirola", 18, "lacala", 1, 3),
    _t1("Chaparral Golf Club", "Tee 1", "Mijas / Fuengirola", 18, "chaparral", 45),
    _t1("Chaparral Golf Club", "Summer 18", "Mijas / Fuengirola", 18, "chaparral", 523),
    _t1("Chaparral Golf Club", "Summer 9", "Mijas / Fuengirola", 9, "chaparral", 524),
    _t1("Calanova Golf Club", "", "Mijas / Fuengirola", 18, "calanova", 23),
    _t1("Calanova Golf Club", "Tee 10 (9)", "Mijas / Fuengirola", 9, "calanova", 39),
    _t1("Santana Golf", "", "Mijas / Fuengirola", 18, "santana", 60),
    _t1("Mijas Golf Club", "Los Lagos", "Mijas / Fuengirola", 18, "mijas", 58),
    _t1("Mijas Golf Club", "Los Olivos", "Mijas / Fuengirola", 18, "mijas", 59),
    Course(club="Miraflores Golf", course="", area="Mijas / Fuengirola", holes=18,
           platform="mastergolf", tenant="miraflores"),
    _t1("La Noria Golf", "", "Mijas / Fuengirola", 18, "noria", 155),
    _t1("La Noria Golf", "9 holes", "Mijas / Fuengirola", 9, "noria", 156),

    # --- Just inland of the corridor (off by default) ------------------------
    _gm("Alhaurín Golf", "", "Inland (Alhaurín)", 18, "alhaurin", 1, corridor=False),
    _gm("Lauro Golf", "", "Inland (Alhaurín)", 18, "lauro", 1, corridor=False),
]


ALGARVE_COURSES: list[Course] = [
    # --- Lagos / Sagres ------------------------------------------------------
    _gm("Espiche Golf", "", "Lagos / Sagres", 18, "espiche", 1, region=ALGARVE),
    _gm("Boavista Golf", "", "Lagos / Sagres", 18, "boavista", 1, region=ALGARVE),
    # Palmares sells its three nines as one 18 off whichever tee the club opens
    # that day, so there is nothing here to split.
    _gm("Onyria Palmares", "", "Lagos / Sagres", 18, "palmares", 9, region=ALGARVE),

    # --- Portimão / Silves ---------------------------------------------------
    _gm("NAU Morgado", "Morgado", "Portimão / Silves", 18, "morgadoalamos", 1,
        region=ALGARVE),
    _gm("NAU Morgado", "Álamos", "Portimão / Silves", 18, "morgadoalamos", 2,
        region=ALGARVE),
    _gm("Amendoeira Golf Resort", "Faldo", "Portimão / Silves", 18, "amendoeira", 1,
        region=ALGARVE),
    _gm("Amendoeira Golf Resort", "O'Connor Jnr", "Portimão / Silves", 18, "amendoeira", 2,
        region=ALGARVE),

    # --- Albufeira -----------------------------------------------------------
    _gm("NAU Salgados", "", "Albufeira", 18, "salgados", 1, region=ALGARVE),

    # --- Vilamoura -----------------------------------------------------------
    # Dom Pedro's courses share one tenant and are told apart by resource type.
    # Victoria is sold through the resort rather than this engine.
    _gm("Dom Pedro Vilamoura", "Old Course", "Vilamoura", 18, "dompedro", 2, region=ALGARVE),
    _gm("Dom Pedro Vilamoura", "Pinhal", "Vilamoura", 18, "dompedro", 5, region=ALGARVE),
    _gm("Dom Pedro Vilamoura", "Millennium", "Vilamoura", 18, "dompedro", 4, region=ALGARVE),
    _gm("Dom Pedro Vilamoura", "Laguna", "Vilamoura", 18, "dompedro", 3, region=ALGARVE),

    # --- Quinta do Lago / Almancil -------------------------------------------
    # Resource types, read off the tee names the engine returns with each slot:
    # 25 = Laranjal, 30 = Norte, 35 = Sul.
    _gmh("Quinta do Lago", "South", "Quinta do Lago / Almancil", 18,
         "quintadolago", area_id=7, rt=35, region=ALGARVE),
    _gmh("Quinta do Lago", "North", "Quinta do Lago / Almancil", 18,
         "quintadolago", area_id=7, rt=30, region=ALGARVE),
    _gmh("Quinta do Lago", "Laranjal", "Quinta do Lago / Almancil", 18,
         "quintadolago", area_id=7, rt=25, region=ALGARVE),
    # Vale do Lobo keeps both courses on one resource type and separates them
    # by tee instead, so these are keyed on the resource.
    _gmh("Vale do Lobo", "Royal", "Quinta do Lago / Almancil", 18,
         "valedolobo", area_id=1, res=8, region=ALGARVE),
    _gmh("Vale do Lobo", "Ocean", "Quinta do Lago / Almancil", 18,
         "valedolobo", area_id=1, res=1, region=ALGARVE),
    _gmh("Vale do Lobo", "Ocean 9", "Quinta do Lago / Almancil", 9,
         "valedolobo", area_id=1, res=2, region=ALGARVE),

    # --- Tavira / Castro Marim -----------------------------------------------
    _gmh("Monte Rei Golf", "North", "Tavira / Castro Marim", 18,
         "monterei", area_id=1, region=ALGARVE),
    _gm("Quinta da Ria", "Quinta da Ria", "Tavira / Castro Marim", 18, "quintadaria", 1,
        region=ALGARVE),
    _gm("Quinta da Ria", "Quinta de Cima", "Tavira / Castro Marim", 18, "quintadaria", 2,
        region=ALGARVE),
    _gm("Benamor Golf", "", "Tavira / Castro Marim", 18, "benamor", 1, region=ALGARVE),
    _gm("Castro Marim Golfe", "", "Tavira / Castro Marim", 18, "castromarim", 1,
        region=ALGARVE),
]


COURSES: list[Course] = [*COSTA_DEL_SOL_COURSES, *ALGARVE_COURSES]

CORRIDOR = [c for c in COURSES if c.corridor]
BY_KEY = {c.key: c for c in COURSES}


def in_region(region: str) -> list[Course]:
    return [c for c in COURSES if c.region == region]
