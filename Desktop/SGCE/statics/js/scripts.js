// Função para carregar módulos dinamicamente
function loadModule(moduleName) {
    $.get(`/templates/${moduleName}.html`, function(data) {
        $(`#modulo-${moduleName}`).html(data);
        initModule(moduleName);
    });
}

// Inicializar módulo específico
function initModule(moduleName) {
    switch(moduleName) {
        case 'filiados':
            initFiliadosModule();
            break;
        case 'calendario':
            initCalendarioModule();
            break;
        case 'comunicacao':
            initComunicacaoModule();
            break;
        // Adicione outros módulos conforme necessário
    }
}

// Inicialização do módulo de filiados
function initFiliadosModule() {
    console.log("Inicializando módulo de filiados");
    
    // Carregar dados de filiados
    $.get('/api/filiados', function(filiados) {
        renderFiliadosTable(filiados);
    });
    
    // Configurar busca
    $('#filiados-search').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        $('.filiado-row').each(function() {
            const nome = $(this).find('.filiado-nome').text().toLowerCase();
            const escola = $(this).find('.filiado-escola').text().toLowerCase();
            if (nome.includes(searchTerm) || escola.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });
}

// Renderizar tabela de filiados
function renderFiliadosTable(filiados) {
    const tableBody = $('#filiados-table tbody');
    tableBody.empty();
    
    filiados.forEach(filiado => {
        const row = `
        <tr class="filiado-row">
            <td class="filiado-nome">${filiado.nome}</td>
            <td>${filiado.tipo}</td>
            <td class="filiado-escola">${filiado.escola}</td>
            <td>${filiado.regiao}</td>
            <td>
                <span class="status-badge ${filiado.apoiador ? 'active' : ''}">
                    ${filiado.apoiador ? 'Apoiador' : 'Não'}
                </span>
            </td>
            <td>
                <button class="btn-action btn-sm">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-sm">
                    <i class="fas fa-comment"></i>
                </button>
            </td>
        </tr>`;
        tableBody.append(row);
    });
}

// Inicialização do módulo de calendário
function initCalendarioModule() {
    console.log("Inicializando módulo de calendário");
    
    // Carregar eventos
    $.get('/api/eventos', function(eventos) {
        renderCalendario(eventos);
    });
}

// Renderizar calendário
function renderCalendario(eventos) {
    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();
    
    // Criar estrutura do calendário
    const firstDay = new Date(ano, mes, 1);
    const lastDay = new Date(ano, mes + 1, 0);
    const diasNoMes = lastDay.getDate();
    
    // Preencher calendário
    let calendarioHTML = '';
    
    // Cabeçalho com dias da semana
    calendarioHTML += `<div class="calendario-header">`;
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(dia => {
        calendarioHTML += `<div class="calendario-dia-header">${dia}</div>`;
    });
    calendarioHTML += `</div>`;
    
    // Dias do mês
    calendarioHTML += `<div class="calendario-body">`;
    
    // Dias vazios no início
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarioHTML += `<div class="calendario-dia empty"></div>`;
    }
    
    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const diaEventos = eventos.filter(e => {
            const dataEvento = new Date(e.data_inicio);
            return dataEvento.getDate() === dia && 
                   dataEvento.getMonth() === mes && 
                   dataEvento.getFullYear() === ano;
        });
        
        const hojeClass = (dia === hoje.getDate() && mes === hoje.getMonth()) ? 'today' : '';
        
        calendarioHTML += `<div class="calendario-dia ${hojeClass}">`;
        calendarioHTML += `<div class="dia-numero">${dia}</div>`;
        
        if (diaEventos.length > 0) {
            calendarioHTML += `<div class="dia-eventos">`;
            diaEventos.slice(0, 2).forEach(evento => {
                calendarioHTML += `<div class="evento-marcador" title="${evento.titulo}"></div>`;
            });
            if (diaEventos.length > 2) {
                calendarioHTML += `<div class="evento-marcador mais">+${diaEventos.length - 2}</div>`;
            }
            calendarioHTML += `</div>`;
        }
        
        calendarioHTML += `</div>`;
    }
    
    calendarioHTML += `</div>`;
    
    $('#calendario-container').html(calendarioHTML);
}

// Inicialização do módulo de comunicação
function initComunicacaoModule() {
    console.log("Inicializando módulo de comunicação");
    
    // Carregar mensagens
    $.get('/api/mensagens', function(mensagens) {
        renderMensagens(mensagens);
    });
    
    // Configurar envio de mensagem
    $('#form-mensagem').on('submit', function(e) {
        e.preventDefault();
        enviarMensagem();
    });
}

// Renderizar lista de mensagens
function renderMensagens(mensagens) {
    const lista = $('#lista-mensagens');
    lista.empty();
    
    mensagens.forEach(msg => {
        const data = new Date(msg.data_envio);
        const enviadaClass = msg.enviada ? 'enviada' : 'pendente';
        
        const item = `
        <div class="mensagem-item ${enviadaClass}">
            <div class="mensagem-header">
                <h3>${msg.titulo}</h3>
                <span class="mensagem-data">${data.toLocaleDateString()}</span>
            </div>
            <div class="mensagem-content">
                <p>${msg.conteudo.substring(0, 100)}...</p>
            </div>
            <div class="mensagem-footer">
                <span class="mensagem-status">${msg.enviada ? 'Enviada' : 'Agendada'}</span>
                <span class="mensagem-destinatarios">${msg.destinatarios} destinatários</span>
            </div>
        </div>`;
        lista.append(item);
    });
}

// Enviar mensagem
function enviarMensagem() {
    const titulo = $('#mensagem-titulo').val();
    const conteudo = $('#mensagem-conteudo').val();
    const segmento = $('#mensagem-segmento').val();
    const agendada = $('#mensagem-agendada').is(':checked');
    const dataAgendamento = agendada ? $('#mensagem-data').val() : null;
    
    $.post('/api/mensagens', {
        titulo: titulo,
        conteudo: conteudo,
        segmento: segmento,
        agendada: agendada,
        data_agendamento: dataAgendamento
    }, function(response) {
        if (response.success) {
            alert('Mensagem agendada com sucesso!');
            $('#form-mensagem')[0].reset();
            loadModule('comunicacao');
        } else {
            alert('Erro ao agendar mensagem: ' + response.message);
        }
    });
}

// Inicialização geral
$(document).ready(function() {
    // Controle de módulos
    $('.nav-modulos button').click(function() {
        $('.nav-modulos button').removeClass('active');
        $(this).addClass('active');
        
        const moduloId = $(this).data('modulo');
        $('.modulo').removeClass('active');
        $(`#modulo-${moduloId}`).addClass('active');
        
        // Carregar módulo se necessário
        if ($(`#modulo-${moduloId}`).is(':empty')) {
            loadModule(moduloId);
        }
    });
    
    // Carregar dados do dashboard
    loadDashboardData();
    
    // Verificar se estamos na página de login
    if ($('#login-page').length) {
        $('#login-form').on('submit', function(e) {
            e.preventDefault();
            realizarLogin();
        });
    }
});

// Função para carregar dados do dashboard
function loadDashboardData() {
    $.get('/api/kpi', function(data) {
        // Atualizar KPIs
        $('#kpi-total-filiados').text(data.filiados.total);
        $('#kpi-total-apoiadores').text(data.filiados.apoiadores);
        
        const taxaApoio = data.filiados.apoiadores / data.filiados.total * 100;
        $('#kpi-taxa-apoio').text(taxaApoio.toFixed(1) + '%');
        
        $('#kpi-eventos').text(data.eventos_proximos);
        
        // Atualizar gráfico de evolução
        renderEvolucaoChart(data.evolucao);
        
        // Atualizar próximos eventos
        renderProximosEventos(data.eventos);
        
        // Atualizar metas em destaque
        renderMetasDestaque(data.metas);
    });
}

// Renderizar gráfico de evolução
function renderEvolucaoChart(evolucaoData) {
    const ctx = document.getElementById('evolucao-chart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: evolucaoData.labels,
            datasets: [{
                label: 'Apoiadores',
                data: evolucaoData.apoiadores,
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                tension: 0.3,
                fill: true
            }, {
                label: 'Filiados',
                data: evolucaoData.filiados,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Renderizar próximos eventos
function renderProximosEventos(eventos) {
    let eventosHtml = '';
    eventos.slice(0, 5).forEach(evento => {
        const date = new Date(evento.data_inicio);
        eventosHtml += `
        <div class="evento-item">
            <div class="evento-date">
                ${date.getDate()}/${date.getMonth()+1}
            </div>
            <div class="evento-info">
                <strong>${evento.titulo}</strong>
                <div>${evento.local}</div>
            </div>
        </div>`;
    });
    $('#proximos-eventos').html(eventosHtml);
}

// Renderizar metas em destaque
function renderMetasDestaque(metas) {
    let metasHtml = '';
    metas.slice(0, 3).forEach(meta => {
        const progresso = (meta.valor_atual / meta.valor_alvo) * 100;
        metasHtml += `
        <div class="meta-item">
            <div class="meta-header">
                <h4>${meta.titulo}</h4>
                <span>${meta.valor_atual}/${meta.valor_alvo}</span>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: ${progresso}%"></div>
            </div>
            <div class="meta-footer">
                <span>${meta.dias_restantes} dias restantes</span>
                <span>${progresso.toFixed(1)}%</span>
            </div>
        </div>`;
    });
    $('#metas-destaque').html(metasHtml);
}