"""Registry of the golf courses covered, west (Sotogrande) to east (Fuengirola).

Every entry below was verified live against the club's own public booking
engine. Regenerate/verify with ``python -m tools.discover``.
"""
from __future__ import annotations

from .models import Course

# Areas are listed west -> east so the UI can group results geographically.
AREAS = [
    "Sotogrande / San Roque",
    "Casares / Manilva",
    "Estepona",
    "Benahavís",
    "San Pedro / Nueva Andalucía",
    "Marbella",
    "Mijas / Fuengirola",
    "Inland (Alhaurín)",
]


def _gm(club, course, area, holes, tenant, rt, res=None, corridor=True):
    return Course(
        club=club, course=course, area=area, holes=holes, platform="golfmanager",
        tenant=tenant, resource_type=rt, resource=res, corridor=corridor,
    )


def _t1(club, course, area, holes, tenant, route, corridor=True):
    return Course(
        club=club, course=course, area=area, holes=holes, platform="teeone",
        tenant=tenant, route=str(route), corridor=corridor,
    )


COURSES: list[Course] = [
    # --- Sotogrande / San Roque ---------------------------------------------
    _gm("Real Club Valderrama", "", "Sotogrande / San Roque", 18, "valderrama", 1, 1),
    _gm("La Reserva Club Sotogrande", "", "Sotogrande / San Roque", 18, "lareserva", 1),
    _gm("The Alto Club (Almenara)", "", "Sotogrande / San Roque", 18, "almenara", 1),
    _gm("The San Roque Club", "Old Course", "Sotogrande / San Roque", 18, "sanroqueclub", 1),
    _t1("La Cañada Club de Golf", "", "Sotogrande / San Roque", 18, "canada", 151),
    # Members' club: its engine is live but publishes no visitor green fees.
    Course(club="R.C.G. Sotogrande", course="", area="Sotogrande / San Roque",
           holes=18, platform="golfmanager-hosted", tenant="golfsotogrande",
           resource_type=1),
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
    Course(club="Greenlife Golf Marbella", course="", area="Marbella", holes=9,
           platform="golfmanager-hosted", tenant="greenlife", resource_type=1),

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

CORRIDOR = [c for c in COURSES if c.corridor]
BY_KEY = {c.key: c for c in COURSES}
