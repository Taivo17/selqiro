
export const FIELD_LABELS = {
  et: {
    brand: "Mark",
    model: "Mudel",
    year: "Aasta",
    generation: "Põlvkond / kere kood",
    fuel: "Kütus",
    engine: "Mootor",
    power: "Võimsus",
    gearbox: "Käigukast",
    drivetrain: "Vedav sild",
    mileage: "Läbisõit",
    vin: "VIN",
    registration_number: "Registreerimisnumber",
    body_type: "Keretüüp",
    doors: "Uste arv",
    seats: "Istekohti",
    color: "Värv",
    inspection_valid_until: "Ülevaatus kehtib kuni",
    condition: "Seisukord",
    type: "Tüüp",
    length: "Pikkus",
    width: "Laius",
    height: "Kõrgus",
    weight: "Kaal",
    material: "Materjal",
    quantity: "Kogus",
    manufacturer: "Tootja",
    part_number: "Osa number",
    serial_number: "Seerianumber",
    voltage: "Pinge",
    capacity: "Mahutavus",
    storage: "Mälumaht",
    ram: "RAM",
    processor: "Protsessor",
    screen_size: "Ekraani suurus",
    operating_system: "Operatsioonisüsteem",
    battery_health: "Aku seisukord",
    included_accessories: "Kaasasolevad tarvikud",
    dimensions: "Mõõdud",
    district: "Piirkond / linnaosa",
    area: "Pindala",
    rooms: "Tube",
    floor: "Korrus",
    total_floors: "Korruseid kokku",
    year_built: "Ehitusaasta",
    heating_type: "Kütte tüüp",
    energy_class: "Energiaklass",
    furnished: "Möbleeritud",
    parking: "Parkimine",
    size: "Suurus",
    gender: "Sugu",
    season: "Hooaeg",
    authenticity: "Autentsus",
    certification: "Sertifikaat",
  },
} as const;

export function getFieldLabel(
  key: string,
  fallback: string,
  language: string | null | undefined
) {
  if (language === "et") {
    return FIELD_LABELS.et[key as keyof typeof FIELD_LABELS.et] || fallback;
  }

  return fallback;
}
