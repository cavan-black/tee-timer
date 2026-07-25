"""Club websites, keyed by booking-engine tenant.

Only used to harvest hero imagery (see ``tools/harvest_images.py``). Kept
separate from the course registry so a wrong or dead domain can never affect
availability scraping.
"""
from __future__ import annotations

SITES: dict[str, str] = {
    # Sotogrande / San Roque
    "valderrama": "https://www.realclubvalderrama.com",
    "lareserva": "https://www.lareservaclubsotogrande.com",
    "almenara": "https://www.thealtoclub.com",
    "sanroqueclub": "https://www.sanroqueclub.com",
    "canada": "https://www.lacanadagolf.com",
    "lahaciendagolf": "https://lahaciendagolf.com",
    "golfsotogrande": "https://golfsotogrande.com",
    # Casares / Manilva
    "fincacortesin": "https://www.fincacortesin.com",
    "donajulia": "https://www.donajuliagolf.es",
    # Estepona
    "valleromano": "https://www.valleromanogolf.com",
    "azata": "https://www.azatagolf.com",
    "esteponagolf": "https://www.esteponagolf.com",
    "paraiso": "https://elparaisogolfclub.com",
    "atalaya": "https://www.atalaya-golf.com",
    # Benahavís
    "marbellaclub": "https://www.marbellaclubgolf.com",
    "elhigueral": "https://www.elhigueralgolf.com",
    "villapadierna": "https://www.villapadiernagolfclub.es",
    "arqueros": "https://www.losarquerosgolf.com",
    "quinta": "https://www.laquintagolf.com",
    # San Pedro / Nueva Andalucía
    "guadalminagolf": "https://www.guadalminagolf.com",
    "brisas": "https://realclubdegolflasbrisas.com",
    "naranjos": "https://losnaranjos.com",
    "aloha": "https://www.clubdegolfaloha.com",
    # Marbella
    "santaclaramarbella": "https://santaclaragolfmarbella.com",
    "cabopino": "https://www.cabopinogolf.com",
    "rioreal": "https://rioreal.com",
    "marbella": "https://www.higueronmarbellagolfresort.com",
    "santamaria": "https://santamariagolfclub.com",
    "greenlife": "https://greenlife-golf.com",
    # Mijas / Fuengirola
    "lacala": "https://www.lacala.com",
    "chaparral": "https://golfelchaparral.com",
    "calanova": "https://www.calanovagolf.es",
    "santana": "https://santanagolf.com",
    "mijas": "https://mijasgolf.org",
    "miraflores": "https://www.mirafloresgolf.es",
    "noria": "https://www.lanoriagolf.net",
    # Inland
    "alhaurin": "https://www.alhauringolf.com",
    "lauro": "https://www.laurogolf.com",
}
