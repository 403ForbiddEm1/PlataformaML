"""Prueba de simulación tipo expoferia: varias empresas, varios rubros y candidatos escritos a mano.

Los textos NO salen del generador de datos de entrenamiento: están escritos como los escribiría una persona
(sinónimos, años en letras, CV largos, CV sin años, candidatos de otra área, etc.). Cada caso trae el resultado
esperado (1 = apto, 0 = no apto) y una etiqueta con el tipo de situación que prueba.

Uso:  python -m app.models.expo_check            (primera prueba, 57 casos)
      python -m app.models.expo_check --ciega    (segunda prueba, otros rubros)
Son pocos casos escritos a mano: el resultado es orientativo, no una medida exacta de desempeño.
"""
import sys
from collections import defaultdict

from app.config import THRESHOLD
from app.models.predict import score_candidates

# ----------------------------------------------------------------------------- vacantes (una por empresa/rubro)
VACANTES = {
    "Tecnología · backend": "Se busca desarrollador backend con mínimo 3 años de experiencia en Node.js, Express y PostgreSQL. Deseable Docker y Git.",
    "Contabilidad · contador": "Se requiere contador con mínimo 3 años de experiencia en contabilidad general, declaración de impuestos y nómina.",
    "Diseño · diseñador gráfico": "Se busca diseñador gráfico con 2 años de experiencia en Photoshop, Illustrator y branding.",
    "Clínica · médico general": "La Clínica Santa Lucía busca médico general con mínimo 2 años de experiencia en consulta externa, urgencias e historias clínicas.",
    "Clínica · enfermera": "Se necesita enfermera con 2 años de experiencia en cuidados intensivos y administración de medicamentos.",
    "Colegio · docente": "El Colegio Nuevo Horizonte busca docente de matemáticas con 2 años de experiencia en planificación de clases, evaluación del aprendizaje y manejo de grupos.",
    "Constructora · ingeniero civil": "Constructora Andina requiere ingeniero civil con mínimo 5 años de experiencia en supervisión de obra, presupuestos y AutoCAD.",
}

# ----------------------------------------------------------------------------- CV largos (sirven como "apto" en su área
# y como "otra área" frente a las demás vacantes)
DEV_LARGO = ("Desarrollador backend con 5 años de experiencia construyendo servicios web para empresas de logística y comercio "
             "electrónico. Trabajo principalmente con Node.js y Express, y diseño bases de datos en PostgreSQL. También manejo Docker, "
             "Git y pruebas unitarias con Jest. He participado en la migración de una aplicación monolítica a microservicios y en la "
             "creación de APIs REST documentadas con Swagger. Soy ordenado, me gusta aprender tecnologías nuevas y trabajar en equipo. "
             "Estudié ingeniería en sistemas y tengo nivel intermedio de inglés. Disponibilidad inmediata.")
CONTADOR_LARGO = ("Contador público con 7 años de experiencia en firmas medianas y en el área financiera de una empresa de distribución. "
                  "Me encargo de la contabilidad general, la declaración de impuestos mensuales y anuales, la nómina de más de 80 empleados, "
                  "las conciliaciones bancarias y la preparación de estados financieros. Manejo un sistema contable ERP y Excel avanzado. "
                  "Soy una persona organizada, responsable y con ganas de crecer. Tengo disponibilidad inmediata y puedo presentar "
                  "referencias laborales.")
DISENO_LARGO = ("Diseñadora gráfica con 4 años de experiencia en agencias de publicidad y como freelance. Creo identidad visual y branding "
                "para emprendimientos, diagramación de revistas, material publicitario y piezas para redes sociales. Manejo con soltura "
                "Photoshop, Illustrator e InDesign, y tengo nociones de Figma. Me apasiona la tipografía y la ilustración digital. Soy "
                "creativa, puntual y cumplo con los plazos de entrega. Puedo enviar mi portafolio con trabajos recientes para marcas locales.")
ENFERMERA_LARGO = ("Soy enfermera con 6 años de experiencia en el área hospitalaria. He trabajado en cuidados intensivos y en urgencias, "
                   "haciendo administración de medicamentos, control de signos vitales, curaciones y toma de muestras. Me gradué como "
                   "licenciada en enfermería en la Universidad Central y he hecho cursos de soporte vital básico y control de infecciones. "
                   "Soy responsable, puntual y me gusta trabajar en equipo. Tengo disponibilidad de horario y buenas referencias de mis "
                   "jefes anteriores. En mi tiempo libre me gusta leer y cocinar.")
DOCENTE_LARGO = ("Profesor de matemáticas con 6 años de experiencia en educación secundaria. Realizo la planificación de clases, preparo "
                 "guías y material didáctico, aplico evaluaciones del aprendizaje y llevo el manejo de grupos de hasta 35 estudiantes. "
                 "He usado plataformas de educación virtual y doy tutorías personalizadas. Soy licenciado en educación con mención en "
                 "matemáticas. Me gusta el trabajo en equipo y la comunicación con los padres de familia. Disponibilidad de horario completo.")
MEDICO_LARGO = ("Médico general con 5 años de experiencia en consulta externa y urgencias en un hospital público y una clínica privada. "
                "Realizo historias clínicas, diagnóstico y seguimiento de pacientes crónicos, y he participado en campañas de "
                "vacunación. Egresado de la Universidad Nacional, con cursos de RCP avanzado y manejo del paciente crítico. Soy "
                "responsable, empático y tengo disponibilidad para guardias nocturnas.")
INGENIERO_LARGO = ("Ingeniero civil con 9 años de experiencia en construcción de edificios residenciales y obras viales. He realizado "
                   "supervisión de obra, control de contratistas, elaboración de presupuestos y planos en AutoCAD. Cuento con "
                   "certificación en seguridad industrial y manejo de personal de hasta 60 trabajadores. Soy comprometido, "
                   "organizado y con capacidad de liderazgo. Disponibilidad para viajar.")

# (vacante, tipo de situación, texto del candidato, esperado)
CASOS = [
    # --- backend
    ("Tecnología · backend", "fuerte, texto exacto", "Desarrollador backend con 5 años de experiencia en Node.js, Express, PostgreSQL y Docker.", 1),
    ("Tecnología · backend", "fuerte, otras palabras", "Programador con 4 años trabajando con Node, Express y Postgres. He montado APIs y despliegues con Docker.", 1),
    ("Tecnología · backend", "fuerte, años en letras", "Ingeniero de software backend, cinco años de experiencia desarrollando servicios con NodeJS, Express y PostgreSQL.", 1),
    ("Tecnología · backend", "fuerte, sin años", "Desarrollador backend especializado en Node.js, Express y PostgreSQL. He liderado la migración de una API monolítica a microservicios y escrito pruebas automatizadas.", 1),
    ("Tecnología · backend", "fuerte, '6+ años'", "Backend developer con 6+ años de experiencia. Stack: Node.js, Express, PostgreSQL, Redis y Git.", 1),
    ("Tecnología · backend", "fuerte, CV largo", DEV_LARGO, 1),
    ("Tecnología · backend", "no cumple experiencia", "Desarrollador backend recién egresado con conocimientos en Node.js, Express y PostgreSQL.", 0),
    ("Tecnología · backend", "estudiante con cursos", "Estudiante de ingeniería de sistemas, he hecho cursos de Node.js, Express y PostgreSQL. Sin experiencia laboral aún.", 0),
    ("Tecnología · backend", "otra tecnología", "Desarrollador frontend con 4 años de experiencia en React, HTML, CSS y JavaScript.", 0),
    ("Tecnología · backend", "otra área, corto", "Enfermera con 5 años de experiencia en cuidados intensivos y atención al paciente.", 0),
    ("Tecnología · backend", "otra área, CV largo", ENFERMERA_LARGO, 0),
    ("Tecnología · backend", "otra área, CV largo", CONTADOR_LARGO, 0),
    # --- contador
    ("Contabilidad · contador", "fuerte, texto exacto", "Contador público con 6 años de experiencia en contabilidad general, declaración de impuestos y nómina.", 1),
    ("Contabilidad · contador", "fuerte, otras palabras", "Contadora con cuatro años en contabilidad, declaraciones de impuestos y manejo de nómina de pequeñas empresas.", 1),
    ("Contabilidad · contador", "fuerte, CV largo", CONTADOR_LARGO, 1),
    ("Contabilidad · contador", "fuerte, sin años", "Contador con experiencia en contabilidad general, impuestos y nómina; he llevado la contabilidad de una cadena de farmacias.", 1),
    ("Contabilidad · contador", "fuerte, CV corto", "Asistente contable. 3 años en nómina, impuestos y contabilidad general.", 1),
    ("Contabilidad · contador", "no cumple experiencia", "Contador recién egresado con conocimientos en contabilidad general, impuestos y nómina.", 0),
    ("Contabilidad · contador", "perfil inferior", "Auxiliar administrativo con 1 año de experiencia en archivo y atención al cliente.", 0),
    ("Contabilidad · contador", "otra área, CV largo", DISENO_LARGO, 0),
    ("Contabilidad · contador", "otra área, CV largo", ENFERMERA_LARGO, 0),
    # --- diseño
    ("Diseño · diseñador gráfico", "fuerte, texto exacto", "Diseñador gráfico con 3 años de experiencia en Photoshop, Illustrator y branding.", 1),
    ("Diseño · diseñador gráfico", "fuerte, otras palabras", "Ilustrador con 3 años de experiencia usando Adobe Photoshop e Illustrator. Diseño de logos, identidad de marca y piezas para Instagram.", 1),
    ("Diseño · diseñador gráfico", "fuerte, años en letras", "Diseñadora gráfica, dos años creando identidad visual y manejo de Photoshop e Illustrator.", 1),
    ("Diseño · diseñador gráfico", "fuerte, sin años", "Diseñador gráfico freelance. Trabajo con Photoshop, Illustrator y branding para emprendimientos.", 1),
    ("Diseño · diseñador gráfico", "fuerte, CV largo", DISENO_LARGO, 1),
    ("Diseño · diseñador gráfico", "no cumple experiencia", "Diseñador gráfico recién egresado con conocimientos en Photoshop, Illustrator y branding.", 0),
    ("Diseño · diseñador gráfico", "perfil distinto", "Community manager con 3 años de experiencia en redes sociales, Canva y publicidad digital.", 0),
    ("Diseño · diseñador gráfico", "otra área, corto", "Contador con 5 años de experiencia en contabilidad general y nómina.", 0),
    ("Diseño · diseñador gráfico", "otra área, CV largo", DEV_LARGO, 0),
    # --- médico
    ("Clínica · médico general", "fuerte, texto exacto", "Médico cirujano con 5 años de experiencia en consulta externa y urgencias. Elaboración de historias clínicas y manejo de pacientes crónicos.", 1),
    ("Clínica · médico general", "fuerte, otras palabras", "Dr. con tres años de experiencia en emergencias, atención ambulatoria y registro de historias clínicas. Médico general.", 1),
    ("Clínica · médico general", "fuerte, CV largo", MEDICO_LARGO, 1),
    ("Clínica · médico general", "fuerte, sin años", "Médico general con experiencia en consulta externa, urgencias e historias clínicas en un hospital comunal.", 1),
    ("Clínica · médico general", "no cumple experiencia", "Médico general recién egresado, internado rotatorio en urgencias y consulta externa.", 0),
    ("Clínica · médico general", "otra área, CV largo", DEV_LARGO, 0),
    ("Clínica · médico general", "otra área, corto", "Abogado con 6 años de experiencia en derecho laboral y contratos.", 0),
    ("Clínica · médico general", "área vecina (difícil)", ENFERMERA_LARGO, 0),
    # --- enfermera
    ("Clínica · enfermera", "fuerte, otras palabras", "Licenciada en enfermería con 4 años en UCI, administración de medicamentos y monitoreo de signos vitales.", 1),
    ("Clínica · enfermera", "fuerte, años en letras", "Enfermero con cinco años de experiencia en cuidados intensivos adultos y administración de medicamentos.", 1),
    ("Clínica · enfermera", "fuerte, CV largo", ENFERMERA_LARGO, 1),
    ("Clínica · enfermera", "perfil inferior", "Técnico en enfermería con 1 año en consulta externa y toma de signos vitales.", 0),
    ("Clínica · enfermera", "otra área, CV largo", CONTADOR_LARGO, 0),
    ("Clínica · enfermera", "otra área, corto", "Contador con 6 años de experiencia en impuestos y nómina.", 0),
    # --- docente
    ("Colegio · docente", "fuerte, otras palabras", "Profesor de matemáticas con 6 años de experiencia, planeación de clases, evaluación de aprendizajes y manejo de grupos de secundaria.", 1),
    ("Colegio · docente", "fuerte, años en letras", "Licenciada en Matemáticas, tres años dando clases en bachillerato. Diseño de evaluaciones y recursos didácticos.", 1),
    ("Colegio · docente", "fuerte, CV largo", DOCENTE_LARGO, 1),
    ("Colegio · docente", "no cumple experiencia", "Docente recién egresada en matemáticas. Prácticas en planificación de clases y evaluación.", 0),
    ("Colegio · docente", "otra especialidad", "Profesor de educación física con 8 años de experiencia en planificación de clases y manejo de grupos.", 0),
    ("Colegio · docente", "otra área, CV largo", ENFERMERA_LARGO, 0),
    ("Colegio · docente", "otra área, CV largo", DEV_LARGO, 0),
    # --- ingeniero civil
    ("Constructora · ingeniero civil", "fuerte, texto exacto", "Ingeniero civil con 8 años de experiencia en supervisión de obras, elaboración de presupuestos y AutoCAD.", 1),
    ("Constructora · ingeniero civil", "fuerte, otras palabras", "Ing. Civil, más de 6 años dirigiendo obras residenciales. Presupuestos de obra, planos en AutoCAD y control de contratistas.", 1),
    ("Constructora · ingeniero civil", "fuerte, CV largo", INGENIERO_LARGO, 1),
    ("Constructora · ingeniero civil", "no cumple experiencia", "Ingeniero civil con 2 años de experiencia en AutoCAD y presupuestos.", 0),
    ("Constructora · ingeniero civil", "otra área, CV largo", DISENO_LARGO, 0),
    ("Constructora · ingeniero civil", "otra área, CV largo", CONTADOR_LARGO, 0),
]


# ============================================================================= SEGUNDA PRUEBA ("ciega")
# Escrita DESPUÉS de ajustar el modelo con la primera prueba y SIN mirar cómo le iba a cada algoritmo. Otros rubros,
# otra redacción. Sirve para comprobar que lo corregido no era un ajuste a los 57 casos de arriba.
VACANTES_CIEGAS = {
    "Comercio · vendedor": "Distribuciones del Valle busca vendedor con mínimo 2 años de experiencia en ventas, atención al cliente y seguimiento de clientes. Se valora manejo de CRM.",
    "Logística · almacenista": "Logística Rápida requiere almacenista con 1 año de experiencia en inventario, recepción de mercancía y manejo de montacargas.",
    "Taller · mecánico": "El taller AutoPlus necesita mecánico automotriz con 3 años de experiencia en diagnóstico de fallas, frenos y suspensión y afinación de motores.",
    "Legal · abogado": "La firma legal Andina busca abogado con 3 años de experiencia en derecho laboral, redacción de contratos y audiencias.",
    "Agencia · community manager": "La agencia Pixel busca community manager con 2 años de experiencia en redes sociales, creación de contenido y Canva.",
    "Restaurante · cocinero": "El restaurante La Terraza busca cocinero con 2 años de experiencia en cocina caliente, manejo de alimentos y preparación de menús.",
    "Recursos humanos · analista": "Se requiere analista de recursos humanos con 3 años de experiencia en reclutamiento y selección, nómina e inducción de personal.",
    "Tecnología · full stack": "Se busca desarrollador full stack con 2 años de experiencia en React, Node.js y MongoDB.",
}
VENDEDOR_LARGO = ("Vendedor con 6 años de experiencia en tiendas de electrodomésticos y distribución de consumo masivo. Me encargo de la "
                  "atención al cliente, el seguimiento de clientes frecuentes, las cotizaciones y el cumplimiento de metas mensuales. "
                  "Manejo un sistema CRM y Excel. Soy una persona sociable, puntual y con buena presencia. Tengo licencia de conducir "
                  "y disponibilidad para trabajar fines de semana. Puedo presentar referencias comerciales.")
MECANICO_LARGO = ("Mecánico automotriz con 7 años de experiencia en talleres multimarca. Hago diagnóstico de fallas con escáner, "
                  "reparación de frenos y suspensión, afinación de motores y cambios de aceite. He trabajado con vehículos livianos y "
                  "camionetas. Soy ordenado, cuido las herramientas y cumplo los tiempos de entrega. Tengo cursos de actualización en "
                  "sistemas eléctricos del vehículo y disponibilidad inmediata.")
ABOGADO_LARGO = ("Abogada con 6 años de experiencia en un estudio jurídico y en el área legal de una empresa de servicios. Me "
                 "especializo en derecho laboral: redacción de contratos, despidos, liquidaciones y representación en audiencias. "
                 "Soy egresada de la Universidad Nacional, con posgrado en derecho del trabajo. Me considero una persona analítica, "
                 "responsable y con buena redacción. Hablo inglés intermedio y tengo disponibilidad inmediata.")
COCINERO_LARGO = ("Cocinero con 5 años de experiencia en restaurantes y catering para eventos. Trabajo en cocina caliente, preparo menús "
                  "del día y de temporada, y tengo curso de manejo de alimentos y manipulación higiénica. Sé controlar mermas y "
                  "organizar la mise en place. Soy rápido, resistente al trabajo bajo presión y trabajo bien en equipo. Disponibilidad "
                  "para turnos de noche y fines de semana.")
MARKETING_LARGO = ("Community manager con 3 años de experiencia gestionando las redes sociales de marcas de moda y gastronomía. Creo "
                   "contenido para Instagram y TikTok, programo publicaciones, diseño piezas en Canva y presento reportes mensuales "
                   "de resultados. Soy creativa, curiosa y me adapto rápido a las tendencias. Puedo compartir mi portafolio de "
                   "campañas recientes. Disponibilidad inmediata.")

CASOS_CIEGOS = [
    # --- vendedor
    ("Comercio · vendedor", "fuerte, otras palabras", "Asesor comercial con 4 años de experiencia en ventas de mostrador, atención a clientes y seguimiento de cartera. Manejo de CRM.", 1),
    ("Comercio · vendedor", "fuerte, texto cercano", "Vendedor con 5 años en tiendas de ropa. Atención al cliente, seguimiento de clientes frecuentes y metas de ventas.", 1),
    ("Comercio · vendedor", "fuerte, CV largo", VENDEDOR_LARGO, 1),
    ("Comercio · vendedor", "no cumple experiencia", "Vendedor recién egresado de administración, sin experiencia, con cursos de atención al cliente.", 0),
    ("Comercio · vendedor", "otra área, corto", "Mecánico automotriz con 8 años de experiencia en frenos y suspensión.", 0),
    ("Comercio · vendedor", "otra área, CV largo", COCINERO_LARGO, 0),
    ("Comercio · vendedor", "otra área, CV largo", ABOGADO_LARGO, 0),
    # --- almacenista
    ("Logística · almacenista", "fuerte, otras palabras", "Bodeguero con 3 años en recepción de mercancía, control de inventarios y operador de montacargas.", 1),
    ("Logística · almacenista", "fuerte, sin años", "Auxiliar de almacén con experiencia en inventarios, recepción y despacho de mercancía y montacarga. Certificado de operador.", 1),
    ("Logística · almacenista", "no cumple experiencia", "Almacenista sin experiencia previa, estudiante de logística.", 0),
    ("Logística · almacenista", "otra área, corto", "Chofer con 6 años de experiencia en rutas de reparto y licencia profesional.", 0),
    ("Logística · almacenista", "otra área, CV largo", MARKETING_LARGO, 0),
    ("Logística · almacenista", "otra área, CV largo", MECANICO_LARGO, 0),
    # --- mecánico
    ("Taller · mecánico", "fuerte, años en letras", "Mecánico con cuatro años en talleres: frenos, suspensión, afinación y diagnóstico con escáner.", 1),
    ("Taller · mecánico", "fuerte, '5+ años'", "Técnico mecánico con 5+ años de experiencia en diagnóstico de fallas, afinación de motores, frenos y suspensión.", 1),
    ("Taller · mecánico", "fuerte, CV largo", MECANICO_LARGO, 1),
    ("Taller · mecánico", "no cumple experiencia", "Mecánico automotriz con 1 año de experiencia en cambio de aceite y alineación y balanceo.", 0),
    ("Taller · mecánico", "otra área, corto", "Electricista con 6 años de experiencia en instalaciones eléctricas y tableros.", 0),
    ("Taller · mecánico", "otra área, CV largo", ABOGADO_LARGO, 0),
    # --- abogado
    ("Legal · abogado", "fuerte, texto cercano", "Abogada con 5 años de experiencia en derecho laboral. He redactado contratos y representado a clientes en audiencias.", 1),
    ("Legal · abogado", "fuerte, CV largo", ABOGADO_LARGO, 1),
    ("Legal · abogado", "no cumple experiencia", "Abogado recién titulado, prácticas en derecho laboral y contratos.", 0),
    ("Legal · abogado", "otra área, corto", "Contador con 8 años de experiencia, declaraciones de impuestos y auditoría.", 0),
    ("Legal · abogado", "otra área, CV largo", VENDEDOR_LARGO, 0),
    # --- community manager
    ("Agencia · community manager", "fuerte, texto cercano", "Community manager con 3 años manejando Instagram, Facebook y TikTok. Creación de contenido, Canva y reportes.", 1),
    ("Agencia · community manager", "fuerte, años en letras", "Especialista en marketing digital con dos años de experiencia en redes sociales, contenido y Canva.", 1),
    ("Agencia · community manager", "fuerte, CV largo", MARKETING_LARGO, 1),
    ("Agencia · community manager", "perfil vecino", "Diseñador gráfico con 5 años de experiencia en Photoshop e Illustrator.", 0),
    ("Agencia · community manager", "no cumple experiencia", "Estudiante de comunicación social, sin experiencia; maneja Canva y redes sociales.", 0),
    ("Agencia · community manager", "otra área, CV largo", MECANICO_LARGO, 0),
    # --- cocinero
    ("Restaurante · cocinero", "fuerte, otras palabras", "Chef con seis años en cocina caliente y parrilla. Preparación de menús y manipulación de alimentos.", 1),
    ("Restaurante · cocinero", "fuerte, sin años", "Cocinera con experiencia en cocina caliente, menús del día y manejo higiénico de alimentos. Trabajé en hoteles.", 1),
    ("Restaurante · cocinero", "fuerte, CV largo", COCINERO_LARGO, 1),
    ("Restaurante · cocinero", "no cumple experiencia", "Ayudante de cocina recién egresado de instituto gastronómico.", 0),
    ("Restaurante · cocinero", "otra área, corto", "Mesero con 4 años de experiencia en atención de mesas y caja.", 0),
    ("Restaurante · cocinero", "otra área, CV largo", VENDEDOR_LARGO, 0),
    # --- recursos humanos
    ("Recursos humanos · analista", "fuerte, otras palabras", "Psicóloga organizacional con 4 años en reclutamiento y selección de personal, inducción y manejo de nómina.", 1),
    ("Recursos humanos · analista", "fuerte, años en letras", "Analista de talento humano con cinco años de experiencia: selección de personal, inducciones, liquidación de nómina y capacitaciones.", 1),
    ("Recursos humanos · analista", "perfil inferior", "Auxiliar administrativo con 2 años de experiencia en archivo y atención al cliente.", 0),
    ("Recursos humanos · analista", "no cumple experiencia", "Recién egresado de psicología, interesado en reclutamiento y selección.", 0),
    ("Recursos humanos · analista", "otra área, CV largo", COCINERO_LARGO, 0),
    # --- full stack
    ("Tecnología · full stack", "fuerte, otras palabras", "Programador full stack con dos años de experiencia usando ReactJS, NodeJS y Mongo.", 1),
    ("Tecnología · full stack", "fuerte, texto cercano", "Desarrollador web con 3 años en React y Node. Bases de datos MongoDB y MySQL.", 1),
    ("Tecnología · full stack", "perfil vecino", "Diseñador UX con 4 años en Figma y prototipado.", 0),
    ("Tecnología · full stack", "otra área, corto", "Analista de datos con 5 años de experiencia en Python, SQL y Power BI.", 0),
    ("Tecnología · full stack", "otra área, CV largo", ABOGADO_LARGO, 0),
]


def evaluar(casos=None, vacantes=None) -> dict:
    """Puntúa todos los casos y calcula aciertos, errores y qué tan bien quedó el orden en cada vacante."""
    casos = CASOS if casos is None else casos
    vacantes = VACANTES if vacantes is None else vacantes
    filas, por_vacante = [], defaultdict(list)
    for vac, tag, texto, esperado in casos:
        score = score_candidates(vacantes[vac], [("c", texto)])[0]["score"]
        recomendado = score >= THRESHOLD * 100
        filas.append({"vacante": vac, "tipo": tag, "score": score, "esperado": esperado,
                      "acierto": int(recomendado) == esperado, "palabras": len(texto.split())})
        por_vacante[vac].append((score, esperado))
    orden = {}
    for vac, items in por_vacante.items():
        aptos = [s for s, e in items if e == 1]
        no_aptos = [s for s, e in items if e == 0]
        orden[vac] = min(aptos) > max(no_aptos) if aptos and no_aptos else True
    return {"filas": filas, "orden_perfecto": orden,
            "aciertos": sum(f["acierto"] for f in filas), "total": len(filas)}


def imprimir(res: dict, vacantes=None) -> None:
    for vac in (VACANTES if vacantes is None else vacantes):
        print(f"\n{vac}")
        for f in (x for x in res["filas"] if x["vacante"] == vac):
            marca = "ok   " if f["acierto"] else "FALLA"
            esp = "apto   " if f["esperado"] else "no apto"
            print(f"  {marca} {f['score']:6.1f}  (esperado {esp}, {f['palabras']:3d} palabras)  {f['tipo']}")
    print(f"\nAciertos: {res['aciertos']} de {res['total']}")
    print("Orden perfecto (todos los aptos por encima de todos los no aptos):")
    for vac, ok in res["orden_perfecto"].items():
        print(f"  {'sí' if ok else 'NO'}  {vac}")
    print("Falsos positivos (no aptos recomendados):",
          sum(1 for f in res["filas"] if f["esperado"] == 0 and not f["acierto"]),
          "| Falsos negativos (aptos descartados):",
          sum(1 for f in res["filas"] if f["esperado"] == 1 and not f["acierto"]))


if __name__ == "__main__":
    ciega = "--ciega" in sys.argv
    r = evaluar(CASOS_CIEGOS, VACANTES_CIEGAS) if ciega else evaluar()
    imprimir(r, VACANTES_CIEGAS if ciega else VACANTES)
    sys.exit(0 if r["aciertos"] >= 0.9 * r["total"] else 1)
