import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#718096'))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 756, "Universidad Champagnat | Programación Distribuida — TP N° 5: De API REST a Microservicios")
            self.setStrokeColor(colors.HexColor('#CBD5E0'))
            self.setLineWidth(0.5)
            self.line(36, 750, 576, 750)
            
        # Footer
        self.setStrokeColor(colors.HexColor('#CBD5E0'))
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)
        self.drawString(36, 32, "Repositorio: https://github.com/astorgalucia0-prog/tp5_progdistribuida")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(576, 32, page_str)
        self.restoreState()

pdf_path = r"c:\Users\Usuario\Desktop\Prog- Distribuida\Trabajo Práctico N° 5 - De API REST a Microservicios.pdf"

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=36,
    leftMargin=36,
    topMargin=46,
    bottomMargin=52
)

styles = getSampleStyleSheet()

primary_color = colors.HexColor('#1A365D')    # Navy corporativo UCH
secondary_color = colors.HexColor('#2B6CB0')  # Azul medio
accent_color = colors.HexColor('#2C5282')
dark_text = colors.HexColor('#2D3748')
light_bg = colors.HexColor('#F7FAFC')
border_color = colors.HexColor('#E2E8F0')
tag_bg = colors.HexColor('#EDF2F7')

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=primary_color,
    alignment=1,
    spaceAfter=4
)

subtitle_style = ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=14,
    textColor=secondary_color,
    alignment=1,
    spaceAfter=6
)

meta_style = ParagraphStyle(
    'DocMeta',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor('#4A5568'),
    alignment=1,
    spaceAfter=10
)

h1_style = ParagraphStyle(
    'SectionH1',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11.5,
    leading=15,
    textColor=primary_color,
    spaceBefore=10,
    spaceAfter=4,
    keepWithNext=True
)

h2_style = ParagraphStyle(
    'SectionH2',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9.5,
    leading=13,
    textColor=secondary_color,
    spaceBefore=6,
    spaceAfter=3,
    keepWithNext=True
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11.5,
    textColor=dark_text,
    spaceAfter=4
)

bullet_style = ParagraphStyle(
    'BulletCustom',
    parent=body_style,
    leftIndent=10,
    spaceAfter=2
)

th_style = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white, alignment=1)
tb_style = ParagraphStyle('TB', fontName='Helvetica', fontSize=7.5, leading=9.5, textColor=dark_text)
tb_code_style = ParagraphStyle('TBCode', fontName='Courier', fontSize=7, leading=8.5, textColor=primary_color)
tb_bold_style = ParagraphStyle('TBBold', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, textColor=dark_text)

elements = []

# Encabezado Institucional
elements.append(Paragraph("UNIVERSIDAD CHAMPAGNAT", subtitle_style))
elements.append(Paragraph("Licenciatura en Sistemas de Información — Programación Distribuida", subtitle_style))
elements.append(Paragraph("Trabajo Práctico N° 5: De API REST a Microservicios", title_style))
elements.append(Paragraph("Documento de Diseño Arquitectónico, Desacople Funcional y Trabajo Colaborativo", meta_style))
elements.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

# Ficha de Datos Generales
datos_generales = [
    [Paragraph("<b>Repositorio Remoto Único:</b>", tb_style), Paragraph("<font color='#1A365D'><u>https://github.com/astorgalucia0-prog/tp5_progdistribuida</u></font>", tb_code_style)],
    [Paragraph("<b>Rama Principal / Rama de Trabajo:</b>", tb_style), Paragraph("<code>main</code> | <code>docs/arquitectura</code> (Tag: <code>tp5-entrega</code>)", tb_code_style)],
    [Paragraph("<b>Integrantes del Grupo:</b>", tb_style), Paragraph("<b>Grupo N° 8:</b> Astorga Lucía &bull; Bustos Emmanuel &bull; Lombardo Damián &bull; Militello Santiago", tb_style)],
    [Paragraph("<b>Docentes Colaboradores:</b>", tb_style), Paragraph("Adriel Álvarez (alvarezadriel@uch.edu.ar) &bull; Edgardo Cortez (cortezedgardo@uch.edu.ar)", tb_style)],
    [Paragraph("<b>Versión Funcional de Partida:</b>", tb_style), Paragraph("API REST Distribuida con Consenso Raft (Cluster 3 Nodos), MongoDB y Redis Lock (TP4)", tb_style)]
]
t_general = Table(datos_generales, colWidths=[160, 380])
t_general.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), light_bg),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('TOPPADDING', (0,0), (-1,-1), 3),
]))
elements.append(t_general)
elements.append(Spacer(1, 8))

# 1. Objetivo y Alcance
elements.append(Paragraph("1. Objetivo y Alcance del Trabajo Práctico", h1_style))
elements.append(Paragraph(
    "El objetivo central es evolucionar la aplicación existente hacia una <b>arquitectura basada en microservicios</b>, "
    "incorporando un <b>flujo de trabajo colaborativo profesional con Git</b> (repositorio único compartido, ramas de características, "
    "mensajes semánticos de commit y Pull Requests). La división responde a <b>responsabilidades de negocio claras</b>, baja interdependencia "
    "y el principio <b>Database-per-Service</b>, evitando divisiones artificiales basadas en una tabla por servicio.",
    body_style
))

# 2. Inventario de la Aplicación Existente
elements.append(Paragraph("2. Inventario de Funcionalidades y Endpoints Existentes (Sección 5)", h1_style))
inv_data = [
    [Paragraph("Funcionalidad / Endpoint", th_style), Paragraph("Responsabilidad Actual", th_style), Paragraph("Datos Utilizados", th_style), Paragraph("Dependencias", th_style)],
    [Paragraph("<b>GET /api</b>", tb_code_style), Paragraph("Diagnóstico de salud general, nodo Raft y estado DB/Redis.", tb_style), Paragraph("nodeId, role, estado Mongo/Redis, timestamp.", tb_style), Paragraph("raftNode, database, redis", tb_style)],
    [Paragraph("<b>GET /api/productos</b>", tb_code_style), Paragraph("Listar catálogo comercial; siembra datos iniciales si la BD está vacía.", tb_style), Paragraph("Colección 'productos' (MongoDB).", tb_style), Paragraph("Producto (Mongoose), Mongo", tb_style)],
    [Paragraph("<b>GET /api/productos/:id</b>", tb_code_style), Paragraph("Consulta individual de ficha y existencias por ID o código.", tb_style), Paragraph("id / codigo comercial (PROD-XXX).", tb_style), Paragraph("Producto, MongoDB", tb_style)],
    [Paragraph("<b>POST /api/productos</b>", tb_code_style), Paragraph("Alta de artículo; propone comando al log Raft si es Leader (o 409).", tb_style), Paragraph("codigo, nombre, precio, stock, categoria, desc.", tb_style), Paragraph("raftNode, Producto, Mongo", tb_style)],
    [Paragraph("<b>PUT /api/productos/:id</b>", tb_code_style), Paragraph("Modificación de atributos comerciales o stock con consenso Raft.", tb_style), Paragraph("id, campos a actualizar en req.body.", tb_style), Paragraph("raftNode, Producto, Mongo", tb_style)],
    [Paragraph("<b>DELETE /api/productos/:id</b>", tb_code_style), Paragraph("Baja física del artículo por quórum en Raft.", tb_style), Paragraph("id / codigo.", tb_style), Paragraph("raftNode, Producto, Mongo", tb_style)],
    [Paragraph("<b>POST /api/productos/:id/reservar</b>", tb_code_style), Paragraph("Exclusión mutua con Redis Lock + decremento de stock por consenso Raft.", tb_style), Paragraph("id, lockKey 'lock:producto:id', stock.", tb_style), Paragraph("redis.js, raftNode, MongoDB", tb_style)],
    [Paragraph("<b>GET /raft/status</b>", tb_code_style), Paragraph("Métricas internas y observabilidad del protocolo de consenso.", tb_style), Paragraph("nodeId, role, currentTerm, commitIndex, log.", tb_style), Paragraph("raftNode.getStatus()", tb_style)]
]
t_inv = Table(inv_data, colWidths=[120, 150, 140, 130])
t_inv.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('TOPPADDING', (0,0), (-1,-1), 3),
]))
elements.append(t_inv)
elements.append(Spacer(1, 8))

# 3. Identificación de Acoplamientos
elements.append(Paragraph("3. Identificación de Acoplamientos y Propuesta de Desacople (Sección 7)", h1_style))
acop_data = [
    [Paragraph("Caso", th_style), Paragraph("Acoplamiento Detectado", th_style), Paragraph("Problema Generado", th_style), Paragraph("Propuesta de Desacople", th_style)],
    [
        Paragraph("<b>1</b>", tb_bold_style),
        Paragraph("<b>Catálogo y Stock unificados en Producto.js</b>", tb_style),
        Paragraph("Contención entre lecturas masivas de catálogo y escrituras transaccionales de stock. Imposibilidad de escalar independientemente.", tb_style),
        Paragraph("Separar en dos microservicios: <b>Catalog Service</b> (datos descriptivos) e <b>Inventory Service</b> (existencias y reservas).", tb_style)
    ],
    [
        Paragraph("<b>2</b>", tb_bold_style),
        Paragraph("<b>Lógica de Concurrencia (Redis Lock) embebida en HTTP</b>", tb_style),
        Paragraph("El controlador HTTP orquesta primitivas Redis y timeouts de locking. Si cambia la infraestructura de bloqueo, se quiebra la API REST.", tb_style),
        Paragraph("Encapsular Redis como detalle interno de <b>Inventory Service</b>, exponiendo la interfaz REST limpia <code>POST /inventory/reserve</code>.", tb_style)
    ],
    [
        Paragraph("<b>3</b>", tb_bold_style),
        Paragraph("<b>Dependencia Circular entre Rutas y Consenso Raft</b>", tb_style),
        Paragraph("<code>service.js</code> exporta raftNode hacia <code>endpoints.js</code>, y este último se importa en el servidor. Una falla en Raft tumba toda la API.", tb_style),
        Paragraph("Aislar cada microservicio en procesos Node.js autónomos con ciclo de vida propio y comunicación desacoplada vía HTTP/REST.", tb_style)
    ]
]
t_acop = Table(acop_data, colWidths=[30, 140, 185, 185])
t_acop.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ('TOPPADDING', (0,0), (-1,-1), 3.5),
]))
elements.append(t_acop)
elements.append(Spacer(1, 8))

# 4. Propuesta de Microservicios
elements.append(Paragraph("4. Propuesta y Fichas Técnicas de Microservicios (Sección 8)", h1_style))

# Tabla Resumen de los 3 microservicios
ms_summary = [
    [Paragraph("Microservicio", th_style), Paragraph("Responsabilidad Principal", th_style), Paragraph("Persistencia Exclusiva", th_style), Paragraph("Endpoints Clave", th_style)],
    [
        Paragraph("<b>Catalog Service</b><br/>Puerto :3001", tb_style),
        Paragraph("Gestión de fichas comerciales, categorías y precios oficiales de lista.", tb_style),
        Paragraph("MongoDB: <code>db_catalog</code>", tb_code_style),
        Paragraph("GET /catalog/products<br/>GET /catalog/products/:code<br/>POST /catalog/products", tb_code_style)
    ],
    [
        Paragraph("<b>Inventory Service</b><br/>Puerto :3002", tb_style),
        Paragraph("Control atómico de existencias físicas, reservas concurrentes y devoluciones.", tb_style),
        Paragraph("MongoDB: <code>db_inventory</code><br/>Redis (:6379) Locks & TTL", tb_code_style),
        Paragraph("GET /inventory/:code<br/>POST /inventory/reserve<br/>POST /inventory/confirm", tb_code_style)
    ],
    [
        Paragraph("<b>Orders Service</b><br/>Puerto :3003", tb_style),
        Paragraph("Orquestación del flujo de compras, cálculo de totales y trazabilidad de pedidos.", tb_style),
        Paragraph("MongoDB: <code>db_orders</code>", tb_code_style),
        Paragraph("POST /orders<br/>GET /orders/:id<br/>POST /orders/:id/confirm", tb_code_style)
    ],
    [
        Paragraph("<b>API Gateway</b><br/>Puerto :8080", tb_style),
        Paragraph("Punto único perimetral de acceso, enrutamiento por prefijo, CORS y seguridad.", tb_style),
        Paragraph("N/A (Stateless)", tb_style),
        Paragraph("/api/catalog/* &rarr; :3001<br/>/api/inventory/* &rarr; :3002<br/>/api/orders/* &rarr; :3003", tb_code_style)
    ]
]
t_ms = Table(ms_summary, colWidths=[105, 175, 120, 140])
t_ms.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('TOPPADDING', (0,0), (-1,-1), 3),
]))
elements.append(t_ms)
elements.append(Spacer(1, 8))

# 5. Matriz de Propiedad de Datos
elements.append(Paragraph("5. Matriz de Propiedad y Acceso a los Datos (Sección 9)", h1_style))
elements.append(Paragraph("<b>Regla de Diseño Estricta:</b> Ningún servicio puede modificar directamente la persistencia de otro servicio. Toda interacción debe efectuarse a través de la interfaz pública REST.", body_style))
datos_data = [
    [Paragraph("Dato / Recurso", th_style), Paragraph("Servicio Propietario", th_style), Paragraph("Quién Consulta", th_style), Paragraph("Quién Modifica", th_style), Paragraph("Forma de Acceso", th_style)],
    [Paragraph("Ficha de Producto", tb_style), Paragraph("<b>Catalog Service</b>", tb_style), Paragraph("Clientes, Orders, Inv.", tb_style), Paragraph("Catalog Service", tb_style), Paragraph("GET /catalog/products/:code", tb_code_style)],
    [Paragraph("Precio Oficial Lista", tb_style), Paragraph("<b>Catalog Service</b>", tb_style), Paragraph("Orders Service, Clientes", tb_style), Paragraph("Catalog Service", tb_style), Paragraph("GET /catalog/products/:code", tb_code_style)],
    [Paragraph("Stock Disponible", tb_style), Paragraph("<b>Inventory Service</b>", tb_style), Paragraph("Orders Service, Clientes", tb_style), Paragraph("Inventory Service", tb_style), Paragraph("GET /inventory/:code", tb_code_style)],
    [Paragraph("Reserva de Stock", tb_style), Paragraph("<b>Inventory Service</b>", tb_style), Paragraph("Orders Service", tb_style), Paragraph("Inventory Service", tb_style), Paragraph("POST /inventory/reserve", tb_code_style)],
    [Paragraph("Orden de Compra", tb_style), Paragraph("<b>Orders Service</b>", tb_style), Paragraph("Cliente, Logística", tb_style), Paragraph("Orders Service", tb_style), Paragraph("POST /orders, GET /orders/:id", tb_code_style)]
]
t_datos = Table(datos_data, colWidths=[95, 105, 110, 100, 130])
t_datos.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ('TOPPADDING', (0,0), (-1,-1), 2.5),
]))
elements.append(t_datos)
elements.append(Spacer(1, 8))

# 6. Comunicaciones Inter-Servicio y Casos de Uso
elements.append(Paragraph("6. Comunicaciones Inter-Servicio y Trazado de Casos de Uso (Sección 10)", h1_style))
comms_data = [
    [Paragraph("Origen", th_style), Paragraph("Destino", th_style), Paragraph("Necesidad de Negocio", th_style), Paragraph("Método / Endpoint", th_style), Paragraph("Respuesta Esperada", th_style)],
    [Paragraph("API Gateway", tb_style), Paragraph("Catalog Svc", tb_style), Paragraph("Navegación pública de artículos.", tb_style), Paragraph("GET /catalog/products", tb_code_style), Paragraph("200 OK [items]", tb_style)],
    [Paragraph("Orders Svc", tb_style), Paragraph("Catalog Svc", tb_style), Paragraph("Verificar existencia y fijar precio acordado.", tb_style), Paragraph("GET /catalog/products/:code", tb_code_style), Paragraph("200 OK {price, name}", tb_style)],
    [Paragraph("Orders Svc", tb_style), Paragraph("Inventory Svc", tb_style), Paragraph("Reserva atómica temporal de unidades.", tb_style), Paragraph("POST /inventory/reserve", tb_code_style), Paragraph("200 OK {res_id} / 409 Conflict", tb_style)],
    [Paragraph("Orders Svc", tb_style), Paragraph("Inventory Svc", tb_style), Paragraph("Confirmar deducción de stock tras el pago.", tb_style), Paragraph("POST /inventory/confirm", tb_code_style), Paragraph("200 OK {stock_deducted: true}", tb_style)]
]
t_comms = Table(comms_data, colWidths=[80, 85, 150, 130, 95])
t_comms.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ('TOPPADDING', (0,0), (-1,-1), 2.5),
]))
elements.append(t_comms)
elements.append(Spacer(1, 6))

elements.append(Paragraph("<b>Trazado del Caso de Uso Principal (Creación de Orden con Reserva de Stock):</b>", h2_style))
elements.append(Paragraph(
    "1. <b>Cliente</b> &rarr; <code>POST /api/orders { customer_id: 'CLI-1', items: [{ code: 'PROD-001', qty: 2 }] }</code>.<br/>"
    "2. <b>Orders Service</b> &rarr; <code>GET /api/catalog/products/PROD-001</code>: Consulta a Catalog Service para validar código y precio unitario ($45.000).<br/>"
    "3. <b>Orders Service</b> &rarr; <code>POST /api/inventory/reserve { order_id, items }</code>: Inventory Service toma Lock Redis, descuenta 2 de stock disponible, incrementa stock reservado y responde con <code>reservation_id: 'RES-501'</code>.<br/>"
    "4. <b>Orders Service</b> calcula el total monetario ($90.000), persiste la orden en <code>db_orders</code> con estado <code>PENDING</code> y retorna HTTP 201 Created al cliente.",
    body_style
))
elements.append(Spacer(1, 6))

# 7. Checklist de Validación de Límites
elements.append(Paragraph("7. Checklist de Validación de Límites Arquitectónicos (Sección 12)", h1_style))
check_data = [
    [Paragraph("Criterio de Validación", th_style), Paragraph("Estado", th_style), Paragraph("Fundamentación Técnica", th_style)],
    [Paragraph("Responsabilidad explicada en una frase clara.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("Catalog gestiona fichas y precios; Inventory controla existencias y locks; Orders orquesta compras.", tb_style)],
    [Paragraph("Agrupa reglas de negocio afines.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("Cada servicio concentra la lógica exclusiva de su dominio (precios, stock atómico, pedidos).", tb_style)],
    [Paragraph("No fue creado por existir una tabla previa.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("Se descompuso la entidad monolítica Producto en dominios desacoplados de Catálogo vs. Almacén.", tb_style)],
    [Paragraph("Interfaz pública sin exponer detalles internos.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("JSON REST limpio sobre HTTP. El uso interno de Redis o Mongoose es invisible para el resto.", tb_style)],
    [Paragraph("Modificable internamente sin cambios en cascada.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("Cambiar la base de datos de Inventory de Mongo a Postgres no afecta a Catalog ni a Orders.", tb_style)],
    [Paragraph("No duplica reglas de negocio de otra autoridad.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("Inventory es la única autoridad en stock; Catalog en precios; Orders en estados de compra.", tb_style)],
    [Paragraph("Dependencias necesarias y justificadas.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("Catalog e Inventory son hojas (cero dependencias). Orders solo invoca para validar pedidos.", tb_style)],
    [Paragraph("Límites fuera de alcance explícitos.", tb_style), Paragraph("<font color='#2E7D32'><b>CUMPLE</b></font>", tb_style), Paragraph("Documentados en las fichas de diseño (e.g. Catalog no administra unidades en bodega).", tb_style)]
]
t_check = Table(check_data, colWidths=[180, 60, 300])
t_check.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('ALIGN', (1,0), (1,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ('TOPPADDING', (0,0), (-1,-1), 2.5),
]))
elements.append(t_check)
elements.append(Spacer(1, 8))

# 8. Evidencia de Entregables
elements.append(Paragraph("8. Resumen de Entregables de la Etapa (Sección 14)", h1_style))
elements.append(Paragraph(
    "&bull; <b>1. Repositorio Remoto Único:</b> <font color='#1A365D'><u>https://github.com/astorgalucia0-prog/tp5_progdistribuida</u></font><br/>"
    "&bull; <b>2. Integrantes (Grupo N° 8):</b> Astorga Lucía, Bustos Emmanuel, Lombardo Damián, Militello Santiago<br/>"
    "&bull; <b>3. Docentes Colaboradores:</b> Adriel Álvarez (alvarezadriel@uch.edu.ar) y Edgardo Cortez (cortezedgardo@uch.edu.ar)<br/>"
    "&bull; <b>4. Versión Base Funcional:</b> Preservada en commit inicial <code>d57faec</code> (Cluster Raft 3 nodos con Redis Lock y Mongoose)<br/>"
    "&bull; <b>5. Seguridad y Datos Sensibles:</b> <code>.gitignore</code> blindado (node_modules, .env, *.log, certs) y <code>.env.example</code> documentado<br/>"
    "&bull; <b>6. Trabajo Colaborativo:</b> Ramas <code>main</code> y <code>docs/arquitectura</code>, commits semánticos y Pull Request activo en GitHub<br/>"
    "&bull; <b>7 a 15. Documentación Técnica:</b> Integrada en <code>docs/arquitectura.md</code>, <code>README.md</code> y en el presente informe oficial<br/>"
    "&bull; <b>16. Etiqueta de Entrega:</b> Tag <code>tp5-entrega</code> creado sobre la versión aprobada.",
    body_style
))

# Construir PDF con NumberedCanvas
doc.build(elements, canvasmaker=NumberedCanvas)
print(f"PDF generado con éxito en: {pdf_path}")
