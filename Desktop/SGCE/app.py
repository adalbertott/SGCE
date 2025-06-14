from flask import Flask, render_template, jsonify, request, send_file, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import or_, func
from datetime import datetime, timedelta
import os
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Image
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
import numpy as np
import calendar
from dateutil.relativedelta import relativedelta

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'campanha-sindical-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///campanha.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Modelos de dados (mantidos para outras funcionalidades)
class Filiado(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    tipo = db.Column(db.String(50))  # ACT, Efetivo, Aposentado
    escola = db.Column(db.String(100))
    telefone = db.Column(db.String(20))
    regiao = db.Column(db.String(50))
    urna = db.Column(db.String(20))
    data_filiacao = db.Column(db.DateTime, default=datetime.utcnow)
    habilidades = db.Column(db.String(200))
    tags = db.Column(db.String(200))
    apoiador = db.Column(db.Boolean, default=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    contatado = db.Column(db.Boolean, default=False)
    contato_data = db.Column(db.DateTime)
    observacoes = db.Column(db.Text)

class Evento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    data_inicio = db.Column(db.DateTime, nullable=False)
    data_fim = db.Column(db.DateTime)
    tipo = db.Column(db.String(50))  # assembleia, congresso, eleicao
    local = db.Column(db.String(200))
    regiao = db.Column(db.String(50))
    participantes_confirmados = db.Column(db.Integer, default=0)
    participantes_esperados = db.Column(db.Integer, default=0)
    responsavel = db.Column(db.String(100))

class Meta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    valor_alvo = db.Column(db.Integer, nullable=False)
    valor_atual = db.Column(db.Integer, default=0)
    data_limite = db.Column(db.DateTime)
    tipo = db.Column(db.String(50))  # apoio, filiacao, evento
    regiao = db.Column(db.String(50))
    concluida = db.Column(db.Boolean, default=False)

class Mensagem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(100), nullable=False)
    conteudo = db.Column(db.Text, nullable=False)
    data_envio = db.Column(db.DateTime, default=datetime.utcnow)
    segmento = db.Column(db.String(100))  # regiao, tipo, etc.
    agendada = db.Column(db.Boolean, default=False)
    data_agendamento = db.Column(db.DateTime)
    enviada = db.Column(db.Boolean, default=False)
    destinatarios = db.Column(db.Integer, default=0)
    respostas = db.Column(db.Integer, default=0)

class Contato(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filiado_id = db.Column(db.Integer, db.ForeignKey('filiado.id'))
    data = db.Column(db.DateTime, default=datetime.utcnow)
    tipo = db.Column(db.String(50))  # whatsapp, visita, telefone
    resultado = db.Column(db.String(50))  # positivo, negativo, neutro
    observacoes = db.Column(db.Text)
    responsavel = db.Column(db.String(100))

@app.route('/')
def main_dashboard():  # Mude o nome da função
    session['username'] = "Administrador"
    session['role'] = "admin"
    session['regiao'] = "Todas"
    return render_template('dashboard.html')

@app.route('/login')
def login_page():  # Mude o nome da função
    return redirect(url_for('main_dashboard'))  # Referencie a nova função

@app.route('/filiados')
def filiados():
    # Como não temos autenticação, usamos valores padrão
    regiao = "Todas"
    total_filiados = Filiado.query.count()
    total_apoiadores = Filiado.query.filter_by(apoiador=True).count()
    filiados = Filiado.query.all()
    
    return render_template('filiados.html', 
                          filiados=filiados,
                          total_filiados=total_filiados,
                          total_apoiadores=total_apoiadores)

@app.route('/calendario')
def calendario():
    hoje = datetime.utcnow()
    mes = request.args.get('mes', hoje.month, type=int)
    ano = request.args.get('ano', hoje.year, type=int)
    
    # Obter eventos do mês
    start_date = datetime(ano, mes, 1)
    end_date = datetime(ano, mes, calendar.monthrange(ano, mes)[1])
    
    eventos = Evento.query.filter(
        Evento.data_inicio >= start_date,
        Evento.data_inicio <= end_date
    ).all()
    
    # Criar calendário
    cal = calendar.monthcalendar(ano, mes)
    mes_nome = calendar.month_name[mes]
    
    # Navegação
    prev_mes = mes - 1 if mes > 1 else 12
    prev_ano = ano if mes > 1 else ano - 1
    next_mes = mes + 1 if mes < 12 else 1
    next_ano = ano if mes < 12 else ano + 1
    
    return render_template('calendario.html', 
                          calendario=cal,
                          mes=mes,
                          ano=ano,
                          mes_nome=mes_nome,
                          eventos=eventos,
                          prev_mes=prev_mes,
                          prev_ano=prev_ano,
                          next_mes=next_mes,
                          next_ano=next_ano)

@app.route('/comunicacao')
def comunicacao():
    mensagens = Mensagem.query.order_by(Mensagem.data_envio.desc()).all()
    return render_template('comunicacao.html', mensagens=mensagens)

@app.route('/metas')
def metas():
    metas = Meta.query.order_by(Meta.data_limite).all()
    hoje = datetime.utcnow()
    
    # Calcular progresso
    for meta in metas:
        if meta.valor_atual >= meta.valor_alvo:
            meta.concluida = True
        else:
            dias_restantes = (meta.data_limite - hoje).days
            meta.dias_restantes = max(0, dias_restantes)
    
    return render_template('metas.html', metas=metas)

@app.route('/territorial')
def territorial():
    # Dados para o mapa
    filiados = Filiado.query.all()
    pontos = []
    
    for f in filiados:
        if f.latitude and f.longitude:
            pontos.append({
                'lat': f.latitude,
                'lng': f.longitude,
                'nome': f.nome,
                'tipo': f.tipo,
                'apoiador': f.apoiador,
                'escola': f.escola
            })
    
    return render_template('territorial.html', pontos=pontos)

@app.route('/eventos')
def eventos():
    eventos = Evento.query.order_by(Evento.data_inicio).all()
    return render_template('eventos.html', eventos=eventos)

# API Endpoints
@app.route('/api/filiados', methods=['GET'])
def api_filiados():
    # Sem autenticação - retorna todos os filiados
    filiados = Filiado.query.all()
    
    return jsonify([{
        'id': f.id,
        'nome': f.nome,
        'tipo': f.tipo,
        'escola': f.escola,
        'telefone': f.telefone,
        'regiao': f.regiao,
        'apoiador': f.apoiador,
        'contatado': f.contatado
    } for f in filiados])

@app.route('/api/eventos', methods=['GET'])
def api_eventos():
    eventos = Evento.query.all()
    return jsonify([{
        'id': e.id,
        'titulo': e.titulo,
        'data_inicio': e.data_inicio.strftime('%Y-%m-%dT%H:%M'),
        'data_fim': e.data_fim.strftime('%Y-%m-%dT%H:%M') if e.data_fim else None,
        'tipo': e.tipo,
        'local': e.local,
        'regiao': e.regiao
    } for e in eventos])

@app.route('/api/kpi', methods=['GET'])
def api_kpi():
    # Sem autenticação - usa valores padrão
    total_filiados = Filiado.query.count()
    total_apoiadores = Filiado.query.filter_by(apoiador=True).count()
    total_contatados = Filiado.query.filter_by(contatado=True).count()
    
    # Metas
    metas = Meta.query.filter_by(concluida=False).all()
    
    # Eventos proximos
    hoje = datetime.utcnow()
    eventos_proximos = Evento.query.filter(
        Evento.data_inicio > hoje,
        Evento.data_inicio < hoje + timedelta(days=30)
    ).count()
    
    # Mensagens
    mensagens = Mensagem.query.filter_by(enviada=True).count()
    
    return jsonify({
        'filiados': {
            'total': total_filiados,
            'apoiadores': total_apoiadores,
            'contatados': total_contatados
        },
        'metas': len(metas),
        'eventos_proximos': eventos_proximos,
        'mensagens': mensagens
    })

# Rotas administrativas
@app.route('/admin')
def admin():
    # Sem verificação de permissão
    # users = User.query.all()  # Removido pois não temos mais modelo User
    regioes = db.session.query(Filiado.regiao).distinct().all()
    regioes = [r[0] for r in regioes if r[0]]
    
    return render_template('admin.html', users=[], regioes=regioes)

def init_db():
    # Cria apenas as tabelas necessárias
    db.create_all()
    print("Banco de dados inicializado!")

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host="0.0.0.0", port=port, debug=True)