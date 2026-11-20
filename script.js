const CHAVE_JOGADORES = "jogadoresSorteio";
const CHAVE_FOTO_USUARIO = "fotoUsuarioSorteioFC";

// Elementos da tela de entrada e transição
const telaEntrada = document.getElementById("telaEntrada");
const sistemaPrincipal = document.getElementById("sistemaPrincipal");
const btnEntrarSistema = document.getElementById("btnEntrarSistema");
const btnVoltarCapa = document.getElementById("btnVoltarCapa");
const contadorEntradaJogadores = document.getElementById("contadorEntradaJogadores");

const nomeJogador = document.getElementById("nomeJogador");
const fotoJogador = document.getElementById("fotoJogador");
const previewFoto = document.getElementById("previewFoto");
const fotoPadrao = document.getElementById("fotoPadrao");

const inputFotoUsuario = document.getElementById("inputFotoUsuario");
const fotoPerfilUsuario = document.getElementById("fotoPerfilUsuario");
const avatarUsuarioPadrao = document.getElementById("avatarUsuarioPadrao");
const btnRemoverFotoUsuario = document.getElementById("btnRemoverFotoUsuario");

const posicaoJogador = document.getElementById("posicaoJogador");
const posicaoSecundaria = document.getElementById("posicaoSecundaria");
const descricaoJogador = document.getElementById("descricaoJogador");

const formJogador = document.getElementById("formJogador");
const tituloFormulario = document.getElementById("tituloFormulario");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const quantidadeTimes = document.getElementById("quantidadeTimes");

const btnSortear = document.getElementById("btnSortear");
const btnLimpar = document.getElementById("btnLimpar");

const listaJogadores = document.getElementById("listaJogadores");
const resultado = document.getElementById("resultado");

const totalJogadores = document.getElementById("totalJogadores");
const totalTimes = document.getElementById("totalTimes");
const contadorLista = document.getElementById("contadorLista");

// Elementos do modal de corte e ajuste
const modalRecorte = document.getElementById("modalRecorte");
const tituloModalRecorte = document.getElementById("tituloModalRecorte");
const areaRecorte = document.getElementById("areaRecorte");
const imagemRecortePreview = document.getElementById("imagemRecortePreview");
const zoomRecorte = document.getElementById("zoomRecorte");
const valorZoomRecorte = document.getElementById("valorZoomRecorte");

const btnFecharModalRecorte = document.getElementById("btnFecharModalRecorte");
const btnResetarRecorte = document.getElementById("btnResetarRecorte");
const btnCancelarRecorte = document.getElementById("btnCancelarRecorte");
const btnAplicarRecorte = document.getElementById("btnAplicarRecorte");

let jogadores = [];
let jogadorEditando = null;
let fotoSelecionada = "";

let contextoRecorte = {
    ativo: false,
    alvo: null,
    baseWidth: 0,
    baseHeight: 0,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    arrastando: false,
    inicioX: 0,
    inicioY: 0
};

// Navegação entre a Tela de Entrada e o Sistema Principal
function entrarNoSistema() {
    telaEntrada.classList.add("saindo");

    setTimeout(function () {
        telaEntrada.hidden = true;
        telaEntrada.classList.remove("saindo");
        sistemaPrincipal.hidden = false;
        window.scrollTo({ top: 0, behavior: "instant" });
    }, 450);
}

function voltarParaCapa() {
    sistemaPrincipal.hidden = true;
    telaEntrada.hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" });
}

btnEntrarSistema.addEventListener("click", entrarNoSistema);
btnVoltarCapa.addEventListener("click", voltarParaCapa);

// Carrega e adapta os cadastros anteriores
function carregarJogadores() {
    try {
        const dadosSalvos = JSON.parse(
            localStorage.getItem(CHAVE_JOGADORES)
        ) || [];

        jogadores = dadosSalvos.map(function (item, indice) {
            if (typeof item === "string") {
                return {
                    id: "antigo-" + indice,
                    nome: item,
                    foto: "",
                    posicao: "",
                    posicaoSecundaria: "",
                    caracteristicas: [],
                    descricao: ""
                };
            }

            return {
                id: item.id || "jogador-" + indice,
                nome: item.nome || "",
                foto: item.foto || "",
                posicao: item.posicao || "",
                posicaoSecundaria: item.posicaoSecundaria || "",
                caracteristicas: Array.isArray(item.caracteristicas)
                    ? item.caracteristicas
                    : [],
                descricao: item.descricao || ""
            };
        });
    } catch (erro) {
        jogadores = [];
        alert("Não foi possível carregar os jogadores salvos.");
    }
}

function salvarJogadores() {
    try {
        localStorage.setItem(
            CHAVE_JOGADORES,
            JSON.stringify(jogadores)
        );
        return true;
    } catch (erro) {
        alert(
            "Não foi possível salvar os dados. " +
            "O armazenamento do navegador pode estar cheio. " +
            "Tente usar imagens menores."
        );
        return false;
    }
}

// Otimiza a imagem base antes de abrir o recorte
function processarFoto(arquivo) {
    return new Promise(function (resolve, reject) {
        if (!arquivo.type.startsWith("image/")) {
            reject("Selecione um arquivo de imagem válido.");
            return;
        }

        const leitor = new FileReader();

        leitor.onload = function (event) {
            const imagem = new Image();

            imagem.onload = function () {
                const tamanhoMaximo = 900;

                let largura = imagem.width;
                let altura = imagem.height;

                if (largura > altura && largura > tamanhoMaximo) {
                    altura = altura * (tamanhoMaximo / largura);
                    largura = tamanhoMaximo;
                } else if (altura > tamanhoMaximo) {
                    largura = largura * (tamanhoMaximo / altura);
                    altura = tamanhoMaximo;
                }

                const canvas = document.createElement("canvas");
                canvas.width = Math.round(largura);
                canvas.height = Math.round(altura);

                const contexto = canvas.getContext("2d");
                contexto.drawImage(
                    imagem,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };

            imagem.onerror = function () {
                reject("Não foi possível processar essa imagem.");
            };

            imagem.src = event.target.result;
        };

        leitor.onerror = function () {
            reject("Não foi possível ler o arquivo.");
        };

        leitor.readAsDataURL(arquivo);
    });
}

// Funções do modal de corte e ajuste
function atualizarTransformacaoRecorte() {
    imagemRecortePreview.style.transform =
        "translate(calc(-50% + " + contextoRecorte.offsetX + "px), calc(-50% + " + contextoRecorte.offsetY + "px)) scale(" + contextoRecorte.zoom + ")";
    valorZoomRecorte.textContent = Math.round(contextoRecorte.zoom * 100) + "%";
}

function resetarPosicaoRecorte() {
    contextoRecorte.offsetX = 0;
    contextoRecorte.offsetY = 0;
    contextoRecorte.zoom = 1;
    zoomRecorte.value = "1";
    atualizarTransformacaoRecorte();
}

function abrirModalRecorte(imagemBase64, alvo, titulo) {
    contextoRecorte.ativo = true;
    contextoRecorte.alvo = alvo;
    tituloModalRecorte.textContent = titulo || "Ajustar e cortar foto";

    imagemRecortePreview.onload = function () {
        const tamanhoCaixa = areaRecorte.clientWidth || 280;
        const proporcao = imagemRecortePreview.naturalWidth / imagemRecortePreview.naturalHeight;

        if (proporcao >= 1) {
            contextoRecorte.baseHeight = tamanhoCaixa;
            contextoRecorte.baseWidth = tamanhoCaixa * proporcao;
        } else {
            contextoRecorte.baseWidth = tamanhoCaixa;
            contextoRecorte.baseHeight = tamanhoCaixa / proporcao;
        }

        imagemRecortePreview.style.width = contextoRecorte.baseWidth + "px";
        imagemRecortePreview.style.height = contextoRecorte.baseHeight + "px";
        resetarPosicaoRecorte();
    };

    imagemRecortePreview.src = imagemBase64;
    modalRecorte.hidden = false;
}

function fecharModalRecorte() {
    modalRecorte.hidden = true;
    imagemRecortePreview.src = "";
    contextoRecorte.ativo = false;
    contextoRecorte.alvo = null;
    contextoRecorte.arrastando = false;
}

function gerarImagemCortada(tamanhoSaida) {
    const saida = tamanhoSaida || 500;
    const tamanhoCaixa = areaRecorte.clientWidth || 280;
    const escalaSaida = saida / tamanhoCaixa;

    const canvas = document.createElement("canvas");
    canvas.width = saida;
    canvas.height = saida;

    const ctx = canvas.getContext("2d");

    const larguraRenderizada = contextoRecorte.baseWidth * contextoRecorte.zoom;
    const alturaRenderizada = contextoRecorte.baseHeight * contextoRecorte.zoom;

    const centroX = tamanhoCaixa / 2 + contextoRecorte.offsetX;
    const centroY = tamanhoCaixa / 2 + contextoRecorte.offsetY;

    const drawX = (centroX - larguraRenderizada / 2) * escalaSaida;
    const drawY = (centroY - alturaRenderizada / 2) * escalaSaida;
    const drawW = larguraRenderizada * escalaSaida;
    const drawH = alturaRenderizada * escalaSaida;

    ctx.drawImage(imagemRecortePreview, drawX, drawY, drawW, drawH);

    return canvas.toDataURL("image/jpeg", 0.8);
}

areaRecorte.addEventListener("pointerdown", function (event) {
    if (!contextoRecorte.ativo) {
        return;
    }

    contextoRecorte.arrastando = true;
    contextoRecorte.inicioX = event.clientX - contextoRecorte.offsetX;
    contextoRecorte.inicioY = event.clientY - contextoRecorte.offsetY;
    areaRecorte.setPointerCapture(event.pointerId);
});

areaRecorte.addEventListener("pointermove", function (event) {
    if (!contextoRecorte.arrastando) {
        return;
    }

    contextoRecorte.offsetX = event.clientX - contextoRecorte.inicioX;
    contextoRecorte.offsetY = event.clientY - contextoRecorte.inicioY;
    atualizarTransformacaoRecorte();
});

function pararArraste() {
    contextoRecorte.arrastando = false;
}

areaRecorte.addEventListener("pointerup", pararArraste);
areaRecorte.addEventListener("pointercancel", pararArraste);

zoomRecorte.addEventListener("input", function () {
    contextoRecorte.zoom = Number(zoomRecorte.value) || 1;
    atualizarTransformacaoRecorte();
});

btnResetarRecorte.addEventListener("click", resetarPosicaoRecorte);
btnCancelarRecorte.addEventListener("click", fecharModalRecorte);
btnFecharModalRecorte.addEventListener("click", fecharModalRecorte);

btnAplicarRecorte.addEventListener("click", function () {
    if (!contextoRecorte.ativo) {
        return;
    }

    const imagemCortada = gerarImagemCortada(500);
    const alvoAtual = contextoRecorte.alvo;

    if (alvoAtual === "usuario") {
        try {
            localStorage.setItem(CHAVE_FOTO_USUARIO, imagemCortada);
            renderizarFotoUsuario(imagemCortada);
        } catch (erro) {
            alert("Não foi possível salvar sua foto de perfil no armazenamento.");
        }
    } else if (alvoAtual === "jogador") {
        fotoSelecionada = imagemCortada;
        previewFoto.src = fotoSelecionada;
        previewFoto.hidden = false;
        fotoPadrao.hidden = true;
    }

    fecharModalRecorte();
});

// Foto do usuário (organizador)
function renderizarFotoUsuario(fotoBase64) {
    if (fotoBase64) {
        fotoPerfilUsuario.src = fotoBase64;
        fotoPerfilUsuario.hidden = false;
        avatarUsuarioPadrao.hidden = true;
        btnRemoverFotoUsuario.hidden = false;
    } else {
        fotoPerfilUsuario.src = "";
        fotoPerfilUsuario.hidden = true;
        avatarUsuarioPadrao.hidden = false;
        btnRemoverFotoUsuario.hidden = true;
    }
}

function carregarFotoUsuario() {
    try {
        const fotoSalva = localStorage.getItem(CHAVE_FOTO_USUARIO) || "";
        renderizarFotoUsuario(fotoSalva);
    } catch (erro) {
        renderizarFotoUsuario("");
    }
}

inputFotoUsuario.addEventListener("change", async function () {
    const arquivo = inputFotoUsuario.files[0];

    if (!arquivo) {
        return;
    }

    try {
        const imagemBase = await processarFoto(arquivo);
        abrirModalRecorte(imagemBase, "usuario", "Cortar sua foto de perfil");
    } catch (erro) {
        alert(
            typeof erro === "string"
                ? erro
                : "Não foi possível carregar sua foto."
        );
    } finally {
        inputFotoUsuario.value = "";
    }
});

btnRemoverFotoUsuario.addEventListener("click", function () {
    localStorage.removeItem(CHAVE_FOTO_USUARIO);
    renderizarFotoUsuario("");
});

// Foto do jogador
fotoJogador.addEventListener("change", async function () {
    const arquivo = fotoJogador.files[0];

    if (!arquivo) {
        return;
    }

    try {
        const imagemBase = await processarFoto(arquivo);
        abrirModalRecorte(imagemBase, "jogador", "Cortar foto do jogador");
    } catch (erro) {
        alert(
            typeof erro === "string"
                ? erro
                : "Não foi possível carregar a foto."
        );
    } finally {
        fotoJogador.value = "";
    }
});

function obterCaracteristicas() {
    const selecionadas = document.querySelectorAll(
        'input[name="caracteristicas"]:checked'
    );

    return Array.from(selecionadas).map(function (item) {
        return item.value;
    });
}

function limparFormulario() {
    formJogador.reset();

    jogadorEditando = null;
    fotoSelecionada = "";

    previewFoto.src = "";
    previewFoto.hidden = true;
    fotoPadrao.hidden = false;

    tituloFormulario.textContent = "Cadastrar jogador";
    btnSalvar.textContent = "+ Cadastrar jogador";

    btnCancelarEdicao.hidden = true;
}

function atualizarTela() {
    listaJogadores.innerHTML = "";

    totalJogadores.textContent = jogadores.length;
    if (contadorEntradaJogadores) {
        contadorEntradaJogadores.textContent = jogadores.length;
    }

    totalTimes.textContent = quantidadeTimes.value || 0;
    contadorLista.textContent =
        jogadores.length +
        (jogadores.length === 1 ? " jogador" : " jogadores");

    if (jogadores.length === 0) {
        listaJogadores.innerHTML =
            '<p class="mensagem-vazia">Nenhum jogador cadastrado.</p>';
        return;
    }

    jogadores.forEach(function (jogador) {
        const cartao = document.createElement("article");
        cartao.classList.add("cartao-jogador");

        const cabecalho = document.createElement("div");
        cabecalho.classList.add("jogador-cabecalho");

        let foto;

        if (jogador.foto) {
            foto = document.createElement("img");
            foto.src = jogador.foto;
            foto.alt = "Foto de " + jogador.nome;
            foto.classList.add("foto-jogador");
        } else {
            foto = document.createElement("div");
            foto.classList.add("foto-sem-imagem");
            foto.textContent = "👤";
        }

        const informacoes = document.createElement("div");
        informacoes.classList.add("info-jogador");

        const nome = document.createElement("h3");
        nome.textContent = jogador.nome;

        const posicao = document.createElement("span");
        posicao.classList.add("posicao");
        posicao.textContent = jogador.posicao || "Posição não definida";

        informacoes.appendChild(nome);
        informacoes.appendChild(posicao);

        if (jogador.posicaoSecundaria) {
            const secundaria = document.createElement("span");
            secundaria.classList.add("posicao-secundaria");
            secundaria.textContent = "Também joga: " + jogador.posicaoSecundaria;
            informacoes.appendChild(secundaria);
        }

        cabecalho.appendChild(foto);
        cabecalho.appendChild(informacoes);
        cartao.appendChild(cabecalho);

        if (jogador.descricao) {
            const descricao = document.createElement("p");
            descricao.classList.add("descricao-jogador");
            descricao.textContent = jogador.descricao;
            cartao.appendChild(descricao);
        }

        if (jogador.caracteristicas.length > 0) {
            const etiquetas = document.createElement("div");
            etiquetas.classList.add("etiquetas-caracteristicas");

            jogador.caracteristicas.forEach(function (caracteristica) {
                const etiqueta = document.createElement("span");
                etiqueta.classList.add("etiqueta");
                etiqueta.textContent = caracteristica;
                etiquetas.appendChild(etiqueta);
            });

            cartao.appendChild(etiquetas);
        }

        const acoes = document.createElement("div");
        acoes.classList.add("acoes-jogador");

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.classList.add("btn-editar");
        btnEditar.addEventListener("click", function () {
            editarJogador(jogador.id);
        });

        const btnExcluir = document.createElement("button");
        btnExcluir.textContent = "Excluir";
        btnExcluir.classList.add("btn-excluir");
        btnExcluir.addEventListener("click", function () {
            excluirJogador(jogador.id);
        });

        acoes.appendChild(btnEditar);
        acoes.appendChild(btnExcluir);
        cartao.appendChild(acoes);

        listaJogadores.appendChild(cartao);
    });
}

function cadastrarOuAtualizar(event) {
    event.preventDefault();

    const nome = nomeJogador.value.trim();
    const posicao = posicaoJogador.value;
    const posicaoSecundariaValor = posicaoSecundaria.value;
    const descricao = descricaoJogador.value.trim();
    const caracteristicas = obterCaracteristicas();

    if (nome === "" || posicao === "") {
        alert("Preencha o nome e a posição principal.");
        return;
    }

    if (
        posicaoSecundariaValor !== "" &&
        posicaoSecundariaValor === posicao
    ) {
        alert("Escolha uma posição secundária diferente da principal.");
        return;
    }

    const nomeDuplicado = jogadores.some(function (jogador) {
        return (
            jogador.nome.toLowerCase() === nome.toLowerCase() &&
            jogador.id !== jogadorEditando
        );
    });

    if (nomeDuplicado) {
        alert("Esse jogador já está cadastrado!");
        return;
    }

    btnSalvar.disabled = true;

    try {
        if (jogadorEditando !== null) {
            const indice = jogadores.findIndex(function (jogador) {
                return jogador.id === jogadorEditando;
            });

            if (indice === -1) {
                alert("Jogador não encontrado.");
                return;
            }

            const jogadorAnterior = jogadores[indice];

            jogadores[indice] = {
                id: jogadorAnterior.id,
                nome: nome,
                foto: fotoSelecionada || jogadorAnterior.foto,
                posicao: posicao,
                posicaoSecundaria: posicaoSecundariaValor,
                caracteristicas: caracteristicas,
                descricao: descricao
            };
        } else {
            jogadores.push({
                id: "jogador-" + Date.now() + "-" +
                    Math.random().toString(36).slice(2, 8),
                nome: nome,
                foto: fotoSelecionada,
                posicao: posicao,
                posicaoSecundaria: posicaoSecundariaValor,
                caracteristicas: caracteristicas,
                descricao: descricao
            });
        }

        if (!salvarJogadores()) {
            return;
        }

        limparFormulario();
        atualizarTela();

        resultado.innerHTML =
            '<p class="mensagem-vazia">Faça um novo sorteio para atualizar os times.</p>';
    } catch (erro) {
        alert(
            typeof erro === "string"
                ? erro
                : "Ocorreu um erro ao salvar o jogador."
        );
    } finally {
        btnSalvar.disabled = false;
    }
}

function editarJogador(id) {
    const jogador = jogadores.find(function (item) {
        return item.id === id;
    });

    if (!jogador) {
        alert("Jogador não encontrado!");
        return;
    }

    jogadorEditando = jogador.id;

    nomeJogador.value = jogador.nome;
    posicaoJogador.value = jogador.posicao;
    posicaoSecundaria.value = jogador.posicaoSecundaria;
    descricaoJogador.value = jogador.descricao;
    fotoSelecionada = jogador.foto;

    if (jogador.foto) {
        previewFoto.src = jogador.foto;
        previewFoto.hidden = false;
        fotoPadrao.hidden = true;
    } else {
        previewFoto.hidden = true;
        fotoPadrao.hidden = false;
    }

    document.querySelectorAll(
        'input[name="caracteristicas"]'
    ).forEach(function (item) {
        item.checked = jogador.caracteristicas.includes(item.value);
    });

    tituloFormulario.textContent = "Editar jogador";
    btnSalvar.textContent = "Salvar alterações";
    btnCancelarEdicao.hidden = false;

    document.getElementById("formJogador").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function excluirJogador(id) {
    const jogador = jogadores.find(function (item) {
        return item.id === id;
    });

    if (!jogador) {
        return;
    }

    const confirmar = confirm(
        "Deseja realmente excluir " + jogador.nome + "?"
    );

    if (!confirmar) {
        return;
    }

    jogadores = jogadores.filter(function (item) {
        return item.id !== id;
    });

    if (!salvarJogadores()) {
        return;
    }

    if (jogadorEditando === id) {
        limparFormulario();
    }

    atualizarTela();

    resultado.innerHTML =
        '<p class="mensagem-vazia">Faça um novo sorteio para atualizar os times.</p>';
}

// Funções de balanceamento do sorteio
function calcularForcaJogador(jogador) {
    const qtdCaracteristicas = Array.isArray(jogador.caracteristicas)
        ? jogador.caracteristicas.length
        : 0;

    return 1 + qtdCaracteristicas * 0.5;
}

function embaralharArray(lista) {
    const copia = [...lista];

    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
}

function escolherIndiceTimeIdeal(times) {
    let melhorIndice = 0;

    for (let i = 1; i < times.length; i++) {
        const timeAtual = times[i];
        const melhorTime = times[melhorIndice];

        if (timeAtual.jogadores.length < melhorTime.jogadores.length) {
            melhorIndice = i;
            continue;
        }

        if (
            timeAtual.jogadores.length === melhorTime.jogadores.length &&
            timeAtual.forcaTotal < melhorTime.forcaTotal
        ) {
            melhorIndice = i;
        }
    }

    return melhorIndice;
}

function sortearTimes() {
    const numeroTimes = Number(quantidadeTimes.value);

    if (!Number.isInteger(numeroTimes) || numeroTimes < 2) {
        alert("Informe pelo menos 2 times!");
        return;
    }

    if (jogadores.length < numeroTimes) {
        alert("Cadastre pelo menos um jogador para cada time!");
        return;
    }

    const times = Array.from({ length: numeroTimes }, function () {
        return {
            jogadores: [],
            forcaTotal: 0
        };
    });

    const gruposPorPosicao = {};

    jogadores.forEach(function (jogador) {
        const chavePosicao = jogador.posicao || "Sem posição";
        if (!gruposPorPosicao[chavePosicao]) {
            gruposPorPosicao[chavePosicao] = [];
        }
        gruposPorPosicao[chavePosicao].push(jogador);
    });

    const gruposOrdenados = Object.values(gruposPorPosicao)
        .sort(function (a, b) {
            return a.length - b.length;
        });

    gruposOrdenados.forEach(function (grupo) {
        const embaralhados = embaralharArray(grupo);

        embaralhados.forEach(function (jogador) {
            const indiceTime = escolherIndiceTimeIdeal(times);
            times[indiceTime].jogadores.push(jogador);
            times[indiceTime].forcaTotal += calcularForcaJogador(jogador);
        });
    });

    mostrarResultado(times);
}

function mostrarResultado(times) {
    resultado.innerHTML = "";

    times.forEach(function (time, indice) {
        const divTime = document.createElement("div");
        divTime.classList.add("time");

        const titulo = document.createElement("h3");
        titulo.textContent =
            "⚽ TIME " + (indice + 1) +
            " (" + time.jogadores.length + " jogadores)";

        const resumo = document.createElement("small");
        resumo.classList.add("resumo-time");
        resumo.textContent =
            "Índice de equilíbrio: " + time.forcaTotal.toFixed(1);

        divTime.appendChild(titulo);
        divTime.appendChild(resumo);

        time.jogadores.forEach(function (jogador) {
            const linha = document.createElement("div");
            linha.classList.add("jogador-time");

            if (jogador.foto) {
                const foto = document.createElement("img");
                foto.src = jogador.foto;
                foto.alt = jogador.nome;
                foto.classList.add("foto-time");
                linha.appendChild(foto);
            } else {
                const fotoPadraoTime = document.createElement("div");
                fotoPadraoTime.classList.add("foto-time-padrao");
                fotoPadraoTime.textContent = "👤";
                linha.appendChild(fotoPadraoTime);
            }

            const dados = document.createElement("div");
            dados.classList.add("dados-time");

            const nome = document.createElement("strong");
            nome.textContent = jogador.nome;

            const posicao = document.createElement("small");
            posicao.textContent =
                jogador.posicao || "Posição não definida";

            dados.appendChild(nome);
            dados.appendChild(posicao);

            linha.appendChild(dados);
            divTime.appendChild(linha);
        });

        resultado.appendChild(divTime);
    });
}

function limparJogadores() {
    if (jogadores.length === 0) {
        alert("Não existem jogadores para limpar!");
        return;
    }

    const confirmar = confirm(
        "Deseja realmente excluir todos os jogadores cadastrados?"
    );

    if (!confirmar) {
        return;
    }

    const jogadoresAnteriores = jogadores;
    jogadores = [];

    if (!salvarJogadores()) {
        jogadores = jogadoresAnteriores;
        return;
    }

    limparFormulario();
    atualizarTela();

    resultado.innerHTML =
        '<p class="mensagem-vazia">Os times sorteados aparecerão aqui.</p>';
}

// Eventos
formJogador.addEventListener("submit", cadastrarOuAtualizar);
btnCancelarEdicao.addEventListener("click", limparFormulario);
btnSortear.addEventListener("click", sortearTimes);
btnLimpar.addEventListener("click", limparJogadores);

quantidadeTimes.addEventListener("input", function () {
    totalTimes.textContent = quantidadeTimes.value || 0;
});

// Inicialização
carregarJogadores();
carregarFotoUsuario();
atualizarTela();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}