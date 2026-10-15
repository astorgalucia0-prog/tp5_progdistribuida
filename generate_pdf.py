import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

pdf_path = r"c:\Users\Usuario\Desktop\Prog- Distribuida\Trabajo Práctico N° 4 - Consenso Distribuido, Paxos y Raft.pdf"

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=36,
    leftMargin=36,
    topMargin=36,
    bottomMargin=36
)

styles = getSampleStyleSheet()

# Estilos visuales optimizados
primary_color = colors.HexColor('#1A365D')
secondary_color = colors.HexColor('#2B6CB0')
dark_text = colors.HexColor('#2D3748')
light_bg = colors.HexColor('#F7FAFC')
border_color = colors.HexColor('#CBD5E0')

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
    fontSize=12,
    leading=15,
    textColor=secondary_color,
    alignment=1,
    spaceAfter=12
)

meta_style = ParagraphStyle(
    'DocMeta',
    parent=styles['Normal'],
    fontName='Helvetica-Oblique',
    fontSize=9,
    leading=12,
    textColor=colors.HexColor('#4A5568'),
    alignment=1,
    spaceAfter=12
)

h1_style = ParagraphStyle(
    'SectionH1',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=14,
    textColor=primary_color,
    spaceBefore=10,
    spaceAfter=4
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=12.5,
    textColor=dark_text,
    spaceAfter=5
)

bullet_style = ParagraphStyle(
    'BulletCustom',
    parent=body_style,
    leftIndent=12,
    spaceAfter=3
)

q_style = ParagraphStyle(
    'QuestionTitle',
    parent=body_style,
    fontName='Helvetica-Bold',
    textColor=secondary_color,
    spaceBefore=4,
    spaceAfter=2
)

th_style = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, leading=10, textColor=colors.white, alignment=1)
tb_style = ParagraphStyle('TB', fontName='Helvetica', fontSize=8, leading=10, textColor=dark_text)
tb_code_style = ParagraphStyle('TBCode', fontName='Courier', fontSize=7.5, leading=9, textColor=primary_color)

elements = []

# Encabezado
elements.append(Paragraph("UNIVERSIDAD CHAMPAGNAT", subtitle_style))
elements.append(Paragraph("Licenciatura en Sistemas de Información — Programación Distribuida", subtitle_style))
elements.append(Paragraph("Trabajo Práctico N° 4: Consenso Distribuido, Paxos y Raft", title_style))
elements.append(Paragraph("Informe Técnico de Desarrollo e Implementación | Cluster de 3 Nodos Raft", meta_style))
elements.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=10))

# 1. Objetivo
elements.append(Paragraph("1. Objetivo del Trabajo Práctico", h1_style))
elements.append(Paragraph(
    "Evolucionar la API REST desarrollada en el TP3 hacia un <b>sistema distribuido compuesto por un cluster de 3 nodos independientes</b> (<code>node1</code>, <code>node2</code>, <code>node3</code>). El objetivo es implementar y validar una versión educacional completa del algoritmo de consenso <b>Raft</b>, resolviendo los problemas de elección de coordinador, acuerdo por mayoría (Quórum), replicación ordenada de operaciones, tolerancia a fallos por caídas (<i>crash/restart</i>), recuperación de nodos atrasados y persistencia del estado.",
    body_style
))

# 2. Arquitectura del Cluster
elements.append(Paragraph("2. Arquitectura de Nodos y Puertos", h1_style))
nodes_data = [
    [Paragraph("Nodo", th_style), Paragraph("Puerto HTTP", th_style), Paragraph("Puerto HTTPS", th_style), Paragraph("Base MongoDB", th_style), Paragraph("Persistencia Raft", th_style)],
    [Paragraph("<b>node1</b>", tb_style), Paragraph("3001", tb_style), Paragraph("3443", tb_style), Paragraph("tp3_db_node1", tb_code_style), Paragraph("raft_state_node1.json", tb_code_style)],
    [Paragraph("<b>node2</b>", tb_style), Paragraph("3002", tb_style), Paragraph("3444", tb_style), Paragraph("tp3_db_node2", tb_code_style), Paragraph("raft_state_node2.json", tb_code_style)],
    [Paragraph("<b>node3</b>", tb_style), Paragraph("3003", tb_style), Paragraph("3445", tb_style), Paragraph("tp3_db_node3", tb_code_style), Paragraph("raft_state_node3.json", tb_code_style)]
]
t_nodes = Table(nodes_data, colWidths=[65, 75, 80, 140, 160])
t_nodes.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('ALIGN', (1,0), (2,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('TOPPADDING', (0,0), (-1,-1), 4),
]))
elements.append(t_nodes)
elements.append(Spacer(1, 8))

# 3. Resumen de Hitos
elements.append(Paragraph("3. Desarrollo por Hitos Secuenciales", h1_style))
hitos = [
    ("HITO 1 - Cluster e Identidad:", "Instanciación simultánea de 3 procesos con <code>NODE_ID</code> diferenciado, puertos dedicados y MongoDB independiente por nodo. Endpoint de diagnóstico expuesto en <code>GET /api/raft/status</code>."),
    ("HITO 2 - Elección y Quórum:", "Implementación de roles (<code>FOLLOWER</code>, <code>CANDIDATE</code>, <code>LEADER</code>), election timeouts aleatorizados (1500-3000ms), RPC <code>/raft/request-vote</code> y cálculo de quórum por mayoría (&ge; 2 de 3 votos)."),
    ("HITO 3 - Heartbeats y Failover:", "Emisión periódica de heartbeats desde el Leader (<code>/raft/append-entries</code> cada 300ms). Reseteo de temporizadores en followers y re-elección automática transparente ante caída del Leader."),
    ("HITO 4 - Log Replicado y Commit:", "Estructura de entrada <code>{ index, term, command }</code>, verificación de antecedente (<code>prevLogIndex</code>, <code>prevLogTerm</code>) y avance del <code>commitIndex</code> al replicarse en la mayoría del cluster."),
    ("HITO 5 - State Machine y API REST:", "State Machine que aplica a MongoDB local únicamente entradas <i>committed</i>. Rechazo de escrituras recibidas en Followers con respuesta <code>409 Conflict</code> notificando la URL del Leader activo."),
    ("HITO 6 - Recuperación y Persistencia:", "Mecanismo <b>Catch-up</b> con retroceso dinámico de <code>nextIndex</code> para sincronizar followers desfasados, persistencia local del estado (<code>currentTerm</code>, <code>votedFor</code>, <code>log</code>) e integración con Redis Lock (TP2).")
]
for h_title, h_desc in hitos:
    elements.append(Paragraph(f"• <b>{h_title}</b> {h_desc}", bullet_style))

elements.append(Spacer(1, 6))

# 4. Preguntas de Control
elements.append(Paragraph("4. Respuestas a Preguntas de Control de Raft", h1_style))

elements.append(Paragraph("1. ¿Por qué un nodo no debería votar por dos candidatos diferentes dentro del mismo término?", q_style))
elements.append(Paragraph("<b>R:</b> Para garantizar la propiedad de Liderazgo Único por término. Si un nodo emitiera múltiples votos en el mismo término, dos candidatos podrían obtener una mayoría simultáneamente, provocando un estado de división de cerebro (<i>split-brain</i>) y corrompiendo la consistencia de los datos.", body_style))

elements.append(Paragraph("2. ¿Qué debería ocurrir si un mensaje recibido contiene un término mayor al término local?", q_style))
elements.append(Paragraph("<b>R:</b> El nodo debe actualizar inmediatamente su término local (<code>currentTerm = termRecibido</code>), transicionar a rol <code>FOLLOWER</code> y blanquear su voto (<code>votedFor = null</code>). Esto asegura que líderes obsoletos de términos anteriores cedan el mando de inmediato.", body_style))

elements.append(Paragraph("3. ¿Puede un único nodo de un cluster de tres declarar por sí solo que existe consenso?", q_style))
elements.append(Paragraph("<b>R:</b> <b>No.</b> En un cluster de 3 nodos, la mayoría requiere al menos 2 votos (&lfloor;3/2&rfloor; + 1 = 2). Un único nodo representa 1/3 del cluster, por lo que carece de quórum para declararse líder o confirmar un commit.", body_style))

elements.append(Spacer(1, 6))

# 5. Tabla de Escenarios de Prueba
elements.append(Paragraph("5. Escenarios de Prueba Obligatorios y Evidencia de Cumplimiento", h1_style))
tests_data = [
    [Paragraph("Escenario", th_style), Paragraph("Acción Ejecutada", th_style), Paragraph("Comportamiento y Resultado Comprobado", th_style)],
    [Paragraph("<b>A</b>", tb_style), Paragraph("Arranque de 3 nodos", tb_style), Paragraph("Se elige 1 Leader por mayoría (2/3 votos) y 2 Followers reconocen su término.", tb_style)],
    [Paragraph("<b>B</b>", tb_style), Paragraph("Escritura en Follower", tb_style), Paragraph("Responde HTTP 409 Conflict. La operación no se aplica localmente e indica URL del Leader.", tb_style)],
    [Paragraph("<b>C</b>", tb_style), Paragraph("CRUD sobre Leader", tb_style), Paragraph("Operación propuesta, replicada y commiteada. Convergencia idéntica en las 3 bases MongoDB.", tb_style)],
    [Paragraph("<b>D</b>", tb_style), Paragraph("Caída del Leader", tb_style), Paragraph("Al detener el proceso Leader, expira el timeout y los 2 nodos restantes eligen nuevo Leader.", tb_style)],
    [Paragraph("<b>E</b>", tb_style), Paragraph("Quórum 2/3", tb_style), Paragraph("Con 1 nodo caído, el cluster de 2 nodos sigue aceptando y confirmando escrituras.", tb_style)],
    [Paragraph("<b>F</b>", tb_style), Paragraph("Sin Quórum 1/3", tb_style), Paragraph("Con 2 nodos caídos, no hay quórum (&lt; 2 votos). Las escrituras se bloquean o responden timeout.", tb_style)],
    [Paragraph("<b>G</b>", tb_style), Paragraph("Follower Atrasado", tb_style), Paragraph("Al reencender el nodo caído, el Leader retrocede <code>nextIndex</code> y le envía las entradas faltantes.", tb_style)],
    [Paragraph("<b>H</b>", tb_style), Paragraph("Restart Completo", tb_style), Paragraph("Se apagan los 3 nodos. Al reiniciar, leen <code>raft_state.json</code> y recuperan término y log intactos.", tb_style)],
    [Paragraph("<b>I</b>", tb_style), Paragraph("Redis + Raft", tb_style), Paragraph("Reserva de stock obtiene Lock distribuido en Redis (TP2) y luego propone consenso Raft.", tb_style)]
]
t_tests = Table(tests_data, colWidths=[55, 125, 340])
t_tests.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), primary_color),
    ('GRID', (0,0), (-1,-1), 0.5, border_color),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('TOPPADDING', (0,0), (-1,-1), 3),
]))
elements.append(t_tests)

elements.append(Spacer(1, 8))
elements.append(Paragraph("6. Conclusión", h1_style))
elements.append(Paragraph(
    "La implementación realizada demuestra con éxito los principios fundamentales de los sistemas distribuidos con consenso Raft: <b>liderazgo único por término, acuerdo por quórum, State Machine convergente y recuperación resiliente ante fallos</b>.",
    body_style
))

# Construir PDF
doc.build(elements)
print(f"PDF generado exitosamente en: {pdf_path}")
