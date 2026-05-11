"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  Utensils, Receipt, Plus, Search, ShoppingCart, Minus, 
  CheckCircle, ListOrdered, CreditCard, ChevronRight, 
  Banknote, QrCode, SmartphoneNfc, ChefHat, Clock, Check, GlassWater,
  PackageSearch, TrendingUp, AlertTriangle, Edit, BarChart3, BrainCircuit, 
  DollarSign, Sparkles, Tag, Printer, Calendar as CalendarIcon, Filter, History, PlusCircle, User, Trash2, AlertOctagon, LogIn, Users, UserPlus, BookOpen, CheckSquare, RefreshCw
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

// Helper analítico para extrair todas as pessoas distintas de uma mesa
const getPessoasDaMesa = (mesa: any): string[] => {
  if (!mesa) return ["Consumidor"];
  const nomesStr = mesa.cliente || "Consumidor";
  const nomes = nomesStr.split(" / ").map((n: string) => n.trim()).filter(Boolean);
  if (mesa.itens && Array.isArray(mesa.itens)) {
    mesa.itens.forEach((item: any) => {
      if (item.dono && !nomes.includes(item.dono.trim())) {
        nomes.push(item.dono.trim());
      }
    });
  }
  return nomes.length > 0 ? nomes : ["Consumidor"];
};

export default function DashboardGlobal() {
  // ================= ESTADO DE AUTENTICAÇÃO E LOGIN =================
  const [usuarioAtual, setUsuarioAtual] = useState<{ id: string, nome: string, role: "gerente" | "colaborador" } | null>(null);
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [lembrarSenha, setLembrarSenha] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSenha, setRegSenha] = useState("");

  const [visaoAtiva, setVisaoAtiva] = useState<"salao" | "gestao" | "financeiro">("salao");
  const [visaoGestao, setVisaoGestao] = useState<"cardapio" | "estoque" | "perdas" | "equipe" | "fiados">("cardapio");
  
  // ================= ESTADOS DE FILTRO DE DATA =================
  const [periodoFiltro, setPeriodoFiltro] = useState<"dia" | "semana" | "mes" | "ano" | "custom">("dia");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // ================= ESTADOS OPERACIONAIS E SUB-COMANDAS =================
  const [modalNovaComanda, setModalNovaComanda] = useState(false);
  const [tipoAtendimento, setTipoAtendimento] = useState<"mesa" | "avulso">("mesa");
  const [menuLateralAberto, setMenuLateralAberto] = useState(false);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [fichaMesaAberta, setFichaMesaAberta] = useState(false);
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);
  const [pessoasSplit, setPessoasSplit] = useState(1);
  const [pagamentosSplit, setPagamentosSplit] = useState<any[]>([]);
  const [pedidoAtual, setPedidoAtual] = useState<any[]>([]);
  const [mesaSelecionada, setMesaSelecionada] = useState<any>(null);
  const [inputMesaNova, setInputMesaNova] = useState("");
  const [inputNomeCliente, setInputNomeCliente] = useState("");

  // Nomes isolados para gestão de abas na mesma mesa
  const [pessoaAtivaMesa, setPessoaAtivaMesa] = useState<string>("Todos");
  const [modoFechamentoCheckout, setModoFechamentoCheckout] = useState<string>("Todos");

  // ================= ESTADOS DE EDIÇÃO DE MESA ABERTA =================
  const [modalEditarMesa, setModalEditarMesa] = useState(false);
  const [editMesaNum, setEditMesaNum] = useState("");
  const [editMesaCliente, setEditMesaCliente] = useState("");

  // ================= ESTADOS DE DETALHE DE COMANDA FECHADA =================
  const [vendaDetalhe, setVendaDetalhe] = useState<any>(null);

  // ================= ESTADOS DE PREPARO / COZINHA (KDS) =================
  const [pedidosPendentes, setPedidosPendentes] = useState<any[]>([]);
  const [modalPedidosAberto, setModalPedidosAberto] = useState(false);

  // ================= ESTADOS DE BANCO DE DADOS =================
  const [produtosBase, setProdutosBase] = useState<any[]>([]);
  const [mesasReais, setMesasReais] = useState<any[]>([]);
  const [historicoVendas, setHistoricoVendas] = useState<any[]>([]);
  const [insumosBase, setInsumosBase] = useState<any[]>([]);
  const [perdasHistorico, setPerdasHistorico] = useState<any[]>([]);
  const [usuariosEquipe, setUsuariosEquipe] = useState<any[]>([]);
  const [fiadosBase, setFiadosBase] = useState<any[]>([]);

  const [categoriaAtiva, setCategoriaAtiva] = useState("Todas");
  const [buscaProduto, setBuscaProduto] = useState("");
  const categorias = ["Todas", "Bebidas", "Drinks", "Porções", "Lanches"];

  // ================= ESTADOS DE CADASTROS =================
  const [modalNovoProduto, setModalNovoProduto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<string | null>(null);
  const [novoProd, setNovoProd] = useState({ nome: "", categoria: "Bebidas", preco: "" });
  const [receitaTemp, setReceitaTemp] = useState<any[]>([]);
  const [ingredienteTemp, setIngredienteTemp] = useState({ insumo_id: "", qtd: "" });

  const [modalNovoInsumo, setModalNovoInsumo] = useState(false);
  const [insumoEmEdicao, setInsumoEmEdicao] = useState<string | null>(null);
  const [novoInsumo, setNovoInsumo] = useState({ nome: "", formato: "unidade", custo_formato: "", qtd_comprada: "", rendimento: "" });

  const [modalNovaPerda, setModalNovaPerda] = useState(false);
  const [perdaEmEdicao, setPerdaEmEdicao] = useState<any>(null);
  const [novaPerda, setNovaPerda] = useState({ insumo_id: "", quantidade: "" });

  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);
  const [novoMembro, setNovoMembro] = useState({ nome: "", email: "", senha: "", role: "colaborador" });

  // ================= ESTADOS DO FIADO =================
  const [modalGerenciarFiado, setModalGerenciarFiado] = useState(false);
  const [fiadoEmEdicao, setFiadoEmEdicao] = useState<any>(null);
  const [itensSelecionadosFiado, setItensSelecionadosFiado] = useState<number[]>([]);

  // ================= ESTADOS DO MODO OFFLINE / PWA =================
  const [isOffline, setIsOffline] = useState(false);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);

  useEffect(() => { 
    if (usuarioAtual) {
        buscarProdutos(); 
        buscarMesas();
        buscarVendas();
        buscarInsumos();
        buscarPerdas();
        buscarFiados();
        if (usuarioAtual.role === 'gerente') buscarUsuarios();
    }
  }, [usuarioAtual]);

  useEffect(() => {
    const savedQueue = localStorage.getItem('pdv_offline_queue');
    if (savedQueue) {
      try { setSyncQueue(JSON.parse(savedQueue)); } catch(e){}
    }

    const checkStatus = () => setIsOffline(!navigator.onLine);
    checkStatus();

    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg erro', err));
    }

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
    };
  }, []);

  const registrarAcaoOffline = (acao: { tipo: string, payload: any, descricao: string }) => {
    const novaFila = [...syncQueue, { ...acao, id_acao: Date.now().toString() }];
    setSyncQueue(novaFila);
    localStorage.setItem('pdv_offline_queue', JSON.stringify(novaFila));
  };

  const sincronizarFilaOffline = async () => {
    if (syncQueue.length === 0) return alert("Nenhuma ação pendente na fila.");
    if (!navigator.onLine) return alert("O sistema ainda está sem conexão com a internet. Roteie a internet para sincronizar.");

    const filaParaProcessar = [...syncQueue];
    let sucessoCount = 0;

    for (const acao of filaParaProcessar) {
        try {
            if (acao.tipo === 'INICIAR_ATENDIMENTO') {
                const { novaMesa, inputMesaNova, inputNomeCliente, tipoAtendimento } = acao.payload;
                if (tipoAtendimento === "mesa") {
                    const { data: mExiste } = await supabase.from('mesas').select('id').eq('numero', inputMesaNova).maybeSingle();
                    if (mExiste) {
                        await supabase.from('mesas').update({ status: 'ocupada', cliente: inputNomeCliente }).eq('numero', inputMesaNova);
                    } else {
                        await supabase.from('mesas').insert([{ numero: parseInt(inputMesaNova), status: 'ocupada', cliente: inputNomeCliente, total: novaMesa.total || 0, itens: novaMesa.itens || [] }]);
                    }
                } else {
                    await supabase.from('mesas').insert([{ numero: novaMesa.numero, status: 'ocupada', cliente: novaMesa.cliente, total: novaMesa.total || 0, itens: novaMesa.itens || [] }]);
                }
            }
            else if (acao.tipo === 'ENVIAR_PEDIDO') {
                const { mesaNumero, totalNovo, itensAtualizados, pedidoAtual } = acao.payload;
                await supabase.from('mesas').update({ total: totalNovo, itens: itensAtualizados }).eq('numero', mesaNumero);
                
                for (const item of pedidoAtual) {
                    const p = produtosBase.find(pb => pb.id === item.id);
                    if (p && p.receita && Array.isArray(p.receita)) {
                        for (const ing of p.receita) {
                            const { data: insumo } = await supabase.from('insumos').select('*').eq('id', ing.insumo_id).maybeSingle();
                            if (insumo) {
                                let qtdUsada = parseFloat(ing.qtd) * item.quantidade;
                                const novoEstoque = insumo.estoque - qtdUsada;
                                await supabase.from('insumos').update({ estoque: novoEstoque }).eq('id', insumo.id);
                            }
                        }
                    }
                }
            }
            else if (acao.tipo === 'FINALIZAR_PAGAMENTO') {
                const { totalVenda, custoVenda, lucroVenda, nomeCliente, mesaNum, mesaNumero, itensVenda, isParcial, modoFechamentoCheckout } = acao.payload;
                await supabase.from('vendas').insert([{ total_venda: totalVenda, custo_total: custoVenda, lucro_total: lucroVenda, cliente_nome: nomeCliente, mesa_numero: mesaNum, itens: itensVenda || [] }]);
                
                if (isParcial) {
                    const { data: mesaNuvem } = await supabase.from('mesas').select('*').eq('numero', mesaNumero).maybeSingle();
                    if (mesaNuvem && mesaNuvem.itens) {
                        const itensRestantes = mesaNuvem.itens.filter((i: any) => (i.dono || "Consumidor") !== modoFechamentoCheckout);
                        const totalRestante = itensRestantes.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
                        const nomesAtuais = (mesaNuvem.cliente || "Consumidor").split(" / ").map((n: string) => n.trim());
                        const novoClienteStr = nomesAtuais.filter((n: string) => n !== modoFechamentoCheckout).join(" / ") || "Consumidor";
                        await supabase.from('mesas').update({ cliente: novoClienteStr, total: totalRestante, itens: itensRestantes }).eq('id', mesaNuvem.id);
                    }
                } else {
                    await supabase.from('mesas').delete().eq('numero', mesaNumero);
                }
            }
            else if (acao.tipo === 'FINALIZAR_FIADO') {
                const { nomeCliente, totalFiadoAtual, itensMesa, mesaNumero, isParcial, modoFechamentoCheckout } = acao.payload;
                const { data: fiadoExistente } = await supabase.from('fiados').select('*').ilike('cliente_nome', nomeCliente).maybeSingle();
                if (fiadoExistente) {
                    const novoTotal = parseFloat(Number(fiadoExistente.total + totalFiadoAtual).toFixed(2));
                    let itensMesclados = [...fiadoExistente.itens];
                    itensMesa.forEach((itemNovo: any) => {
                        const index = itensMesclados.findIndex((i: any) => i.id === itemNovo.id);
                        if (index >= 0) { itensMesclados[index].quantidade += itemNovo.quantidade; } 
                        else { itensMesclados.push({ ...itemNovo }); }
                    });
                    await supabase.from('fiados').update({ total: novoTotal, itens: itensMesclados }).eq('id', fiadoExistente.id);
                } else {
                    await supabase.from('fiados').insert([{ cliente_nome: nomeCliente, total: totalFiadoAtual, itens: itensMesa }]);
                }
                
                if (isParcial) {
                    const { data: mesaNuvem } = await supabase.from('mesas').select('*').eq('numero', mesaNumero).maybeSingle();
                    if (mesaNuvem && mesaNuvem.itens) {
                        const itensRestantes = mesaNuvem.itens.filter((i: any) => (i.dono || "Consumidor") !== modoFechamentoCheckout);
                        const totalRestante = itensRestantes.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
                        const nomesAtuais = (mesaNuvem.cliente || "Consumidor").split(" / ").map((n: string) => n.trim());
                        const novoClienteStr = nomesAtuais.filter((n: string) => n !== modoFechamentoCheckout).join(" / ") || "Consumidor";
                        await supabase.from('mesas').update({ cliente: novoClienteStr, total: totalRestante, itens: itensRestantes }).eq('id', mesaNuvem.id);
                    }
                } else {
                    await supabase.from('mesas').delete().eq('numero', mesaNumero);
                }
            }
            else if (acao.tipo === 'RECEBER_FIADO') {
                const { fiadoId, clienteNome, totalPago, custoPago, lucroPago, itensRestantesAgrupados, novoTotal, itensPagos } = acao.payload;
                await supabase.from('vendas').insert([{ total_venda: totalPago, custo_total: custoPago, lucro_total: lucroPago, cliente_nome: `Fiado Pago: ${clienteNome}`, mesa_numero: 0, itens: itensPagos || [] }]);
                
                const { data: fiadoNuvem } = await supabase.from('fiados').select('id').ilike('cliente_nome', clienteNome).maybeSingle();
                const targetId = fiadoNuvem ? fiadoNuvem.id : fiadoId;

                if (itensRestantesAgrupados.length === 0) {
                    await supabase.from('fiados').delete().eq('id', targetId);
                } else {
                    await supabase.from('fiados').update({ itens: itensRestantesAgrupados, total: novoTotal }).eq('id', targetId);
                }
            }

            sucessoCount++;
        } catch (err) {
            console.error("Erro na sincronização:", acao, err);
        }
    }

    setSyncQueue([]);
    localStorage.removeItem('pdv_offline_queue');
    
    buscarMesas();
    buscarVendas();
    buscarInsumos();
    buscarFiados();

    alert(`Sincronização concluída! ${sucessoCount} de ${filaParaProcessar.length} ordens despachadas para a nuvem.`);
  };

  const limparFilaOffline = () => {
    if (confirm("ATENÇÃO: Deseja realmente descartar as ações pendentes na fila offline?")) {
        setSyncQueue([]);
        localStorage.removeItem('pdv_offline_queue');
    }
  };

  const buscarProdutos = async () => { const { data } = await supabase.from('produtos').select('*').order('nome'); if (data) setProdutosBase(data); };
  const buscarMesas = async () => { const { data } = await supabase.from('mesas').select('*').order('numero'); if (data) setMesasReais(data); };
  const buscarVendas = async () => { const { data } = await supabase.from('vendas').select('*').order('data_venda', { ascending: false }); if (data) setHistoricoVendas(data); };
  const buscarInsumos = async () => { const { data } = await supabase.from('insumos').select('*').order('nome'); if (data) setInsumosBase(data); };
  const buscarPerdas = async () => { const { data } = await supabase.from('perdas').select('*').order('data_perda', { ascending: false }); if (data) setPerdasHistorico(data); };
  const buscarUsuarios = async () => { const { data } = await supabase.from('usuarios').select('*').order('nome'); if (data) setUsuariosEquipe(data); };
  const buscarFiados = async () => { const { data } = await supabase.from('fiados').select('*').order('data_criacao', { ascending: false }); if (data) setFiadosBase(data); };

  // ================= SISTEMA DE LOGIN REAL E SEGURO (GOTRUE) =================
  const efetuarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsuario || !loginSenha) return alert("Preencha email e senha.");
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: loginUsuario,
            password: loginSenha
        });

        if (authError || !authData.user) { 
            alert("Email ou senha incorretos."); 
            return;
        }
        
        const { data: perfilData, error: perfilError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', loginUsuario)
            .single();
            
        if (perfilError || !perfilData) { 
            alert("Perfil de acesso não encontrado."); 
            return; 
        }

        setUsuarioAtual({ id: perfilData.id, nome: perfilData.nome, role: perfilData.role });
        setVisaoAtiva("salao");
    } catch (err) { 
        alert("Erro de conexão ao fazer login."); 
    }
  };

  const registrarGerente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNome || !regEmail || !regSenha) return alert("Preencha todos os campos.");
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: regEmail,
            password: regSenha
        });
        if (authError) throw authError;

        const { error } = await supabase.from('usuarios').insert([{ 
            nome: regNome, 
            email: regEmail, 
            role: "gerente" 
        }]);
        if (error) throw error;

        alert("Gerente cadastrado com sucesso! Agora faça o login.");
        setIsRegistering(false);
    } catch (err: any) { 
        alert("ERRO AO CADASTRAR: " + (err.message || JSON.stringify(err)));
    }
  };

  const efetuarLogout = async () => {
    await supabase.auth.signOut(); 
    setUsuarioAtual(null); 
    setLoginUsuario(""); 
    setLoginSenha(""); 
    setVisaoAtiva("salao");
  };

  const tocarSomAlerta = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15); 
        setTimeout(() => {
           const osc2 = audioCtx.createOscillator();
           const gain2 = audioCtx.createGain();
           osc2.connect(gain2);
           gain2.connect(audioCtx.destination);
           osc2.type = 'sine';
           osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
           gain2.gain.setValueAtTime(0.5, audioCtx.currentTime);
        
           osc2.start();
           osc2.stop(audioCtx.currentTime + 0.15);
        }, 250);
    } catch (e) { console.error("Áudio não suportado no navegador", e); }
  };

  // ================= LÓGICA FINANCEIRA E FILTROS DE DATA =================
  const dataAtual = new Date();
  const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dataAtual);
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const vendasFiltradas = useMemo(() => {
    const hoje = new Date();
    return historicoVendas.filter(v => {
      if (!v.data_venda) return false;
      const d = new Date(v.data_venda);
      if (periodoFiltro === "dia") return d.toDateString() === hoje.toDateString();
      if (periodoFiltro === "semana") {
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(hoje.getDate() - 7);
        return d >= umaSemanaAtras;
      }
      if (periodoFiltro === "mes") return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      if (periodoFiltro === "ano") return d.getFullYear() === hoje.getFullYear();
      if (periodoFiltro === "custom") {
        if (!dataInicio) return true;
        const start = new Date(`${dataInicio}T00:00:00`);
        const end = dataFim ? new Date(`${dataFim}T23:59:59`) : new Date(`${dataInicio}T23:59:59`);
        return d >= start && d <= end;
      }
      return true;
    });
  }, [historicoVendas, periodoFiltro, dataInicio, dataFim]);
  
  const perdasFiltradas = useMemo(() => {
    const hoje = new Date();
    return perdasHistorico.filter(p => {
      if (!p.data_perda) return false;
      const d = new Date(p.data_perda);
      if (periodoFiltro === "dia") return d.toDateString() === hoje.toDateString();
      if (periodoFiltro === "semana") {
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(hoje.getDate() - 7);
        return d >= umaSemanaAtras;
      }
      if (periodoFiltro === "mes") return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      if (periodoFiltro === "ano") return d.getFullYear() === hoje.getFullYear();
      if (periodoFiltro === "custom") {
        if (!dataInicio) return true;
        const start = new Date(`${dataInicio}T00:00:00`);
        const end = dataFim ? new Date(`${dataFim}T23:59:59`) : new Date(`${dataInicio}T23:59:59`);
        return d >= start && d <= end;
      }
      return true;
    });
  }, [perdasHistorico, periodoFiltro, dataInicio, dataFim]);
  
  const fatTotal = vendasFiltradas.reduce((acc, v) => acc + Number(v.total_venda || 0), 0);
  const lucTotal = vendasFiltradas.reduce((acc, v) => acc + Number(v.lucro_total || 0), 0);
  const margem = fatTotal > 0 ? (lucTotal / fatTotal) * 100 : 0;
  const totalPerdasFin = perdasFiltradas.reduce((acc, p) => acc + Number(p.custo_perda || 0), 0);
  const totalFiadosFin = fiadosBase.reduce((acc, f) => acc + Number(f.total || 0), 0);
  
  const dadosGrafico = useMemo(() => {
    const eventos: any[] = [];
    vendasFiltradas.forEach(v => {
        if (v.data_venda) {
            eventos.push({
                ts: new Date(v.data_venda).getTime(),
                dataRaw: new Date(v.data_venda),
                valor: Number(v.total_venda || 0),
                perda: 0
            });
        }
    });
    perdasFiltradas.forEach(p => {
        if (p.data_perda) {
            eventos.push({
                ts: new Date(p.data_perda).getTime(),
                dataRaw: new Date(p.data_perda),
                valor: 0,
                perda: Number(p.custo_perda || 0)
            });
        }
    });
    
    eventos.sort((a, b) => a.ts - b.ts);
    
    return eventos.map(ev => {
        const label = (periodoFiltro === 'dia' || (periodoFiltro === 'custom' && dataInicio === dataFim))
            ? ev.dataRaw.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : ev.dataRaw.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return {
            data: label,
            valor: ev.valor,
            perda: ev.perda
        };
    });
  }, [vendasFiltradas, perdasFiltradas, periodoFiltro, dataInicio, dataFim]);
  
  const historicoAgrupado = useMemo(() => {
    if (periodoFiltro === "dia" || periodoFiltro === "custom") return vendasFiltradas.map(v => ({ ...v, isConsolidated: false }));
    const map = new Map();
    vendasFiltradas.forEach(v => {
        const d = new Date(v.data_venda);
        let key = "";
        if (periodoFiltro === "semana") key = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
        else if (periodoFiltro === "mes") key = `Semana ${Math.ceil(d.getDate() / 7)} - ${d.toLocaleString('pt-BR', { month: 'short' })}`;
        else if (periodoFiltro === "ano") key = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        key = key.charAt(0).toUpperCase() + key.slice(1);
        if (!map.has(key)) map.set(key, { key, total: 0, count: 0, isConsolidated: true });
        const entry = map.get(key);
        entry.total += Number(v.total_venda);
        entry.count += 1;
    });
    return Array.from(map.values());
  }, [vendasFiltradas, periodoFiltro]);

  // ================= ESTOQUE INTELIGENTE =================
  const abrirParaEdicaoInsumo = (i: any) => {
    setInsumoEmEdicao(i.id);
    setNovoInsumo({ nome: i.nome, formato: "unidade", custo_formato: i.custo_unidade.toString(), qtd_comprada: i.estoque.toString(), rendimento: "1" });
    setModalNovoInsumo(true);
  };
  const salvarInsumo = async () => {
    try {
        const formato = novoInsumo.formato;
        const custoFormato = parseFloat(String(novoInsumo.custo_formato).replace(',', '.')) || 0;
        const qtdComprada = parseFloat(String(novoInsumo.qtd_comprada).replace(',', '.')) || 0;
        const rendimento = parseFloat(String(novoInsumo.rendimento).replace(',', '.')) || 1;

        if (custoFormato === 0 || qtdComprada === 0 || !novoInsumo.nome) return alert("Preencha o nome, o custo e a quantidade comprada.");
        let unidadeFinal = "UN"; let estoqueFinal = qtdComprada; let custoUnidadeFinal = custoFormato;

        if (formato === "garrafa_ml") { unidadeFinal = "ML";
            estoqueFinal = qtdComprada * rendimento; custoUnidadeFinal = custoFormato / rendimento;
        } 
        else if (formato === "pacote_g") { unidadeFinal = "G";
            estoqueFinal = qtdComprada * rendimento; custoUnidadeFinal = custoFormato / rendimento;
        } 
        else if (formato === "kg") { unidadeFinal = "G";
            estoqueFinal = qtdComprada * 1000; custoUnidadeFinal = custoFormato / 1000;
        } 
        else if (formato === "litro") { unidadeFinal = "ML";
            estoqueFinal = qtdComprada * 1000; custoUnidadeFinal = custoFormato / 1000;
        } 

        if (insumoEmEdicao) {
            const insumoOriginal = insumosBase.find(ins => ins.id === insumoEmEdicao);
            if (formato === "unidade" && insumoOriginal) unidadeFinal = insumoOriginal.unidade;
            const { error } = await supabase.from('insumos').update({ nome: novoInsumo.nome, unidade: unidadeFinal, estoque: estoqueFinal, custo_unidade: custoUnidadeFinal }).eq('id', insumoEmEdicao);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('insumos').insert([{ nome: novoInsumo.nome, unidade: unidadeFinal, estoque: estoqueFinal, custo_unidade: custoUnidadeFinal }]);
            if (error) throw error;
        }
        setModalNovoInsumo(false); buscarInsumos();
    } catch (err: any) { alert("ERRO SUPABASE (Insumos): Verifique a estrutura da tabela no banco."); }
  };
  
  // ================= GESTÃO DE PERDAS =================
  const abrirParaEdicaoPerda = (p: any) => {
    setPerdaEmEdicao(p);
    setNovaPerda({ insumo_id: p.insumo_id, quantidade: p.quantidade.toString() }); setModalNovaPerda(true);
  };

  const registrarPerda = async () => {
    try {
        const insumo = insumosBase.find(i => i.id === novaPerda.insumo_id);
        if (!insumo) return;
        let qtdPerdida = parseFloat(String(novaPerda.quantidade).replace(',', '.'));
        if (isNaN(qtdPerdida)) return;

        let custoPerdido = qtdPerdida * insumo.custo_unidade;
        let deducaoEstoque = qtdPerdida;

        if (insumo.unidade === 'KG' || insumo.unidade === 'L') {
            custoPerdido = (qtdPerdida / 1000) * insumo.custo_unidade;
            deducaoEstoque = qtdPerdida / 1000;
        }

        if (perdaEmEdicao) {
            let oldDeducao = perdaEmEdicao.quantidade;
            if (insumo.unidade === 'KG' || insumo.unidade === 'L') oldDeducao = perdaEmEdicao.quantidade / 1000;
            const novoEstoque = insumo.estoque + oldDeducao - deducaoEstoque;
            const { error: errPerda } = await supabase.from('perdas').update({ insumo_id: insumo.id, nome_insumo: insumo.nome, quantidade: qtdPerdida, custo_perda: custoPerdido }).eq('id', perdaEmEdicao.id);
            if (errPerda) throw errPerda;
            const { error: errEst } = await supabase.from('insumos').update({ estoque: novoEstoque }).eq('id', insumo.id);
            if (errEst) throw errEst;
        } else {
            const { error: errPerda } = await supabase.from('perdas').insert([{ insumo_id: insumo.id, nome_insumo: insumo.nome, quantidade: qtdPerdida, custo_perda: custoPerdido }]);
            if (errPerda) throw errPerda;
            const novoEstoque = insumo.estoque - deducaoEstoque;
            const { error: errEst } = await supabase.from('insumos').update({ estoque: novoEstoque }).eq('id', insumo.id);
            if (errEst) throw errEst;
        }
        setModalNovaPerda(false); buscarInsumos(); buscarPerdas();
    } catch (err: any) { alert("ERRO SUPABASE (Perdas)."); }
  };

  // ================= GESTÃO DE EQUIPE =================
  const salvarNovoUsuario = async () => {
    if (!novoMembro.nome || !novoMembro.email || !novoMembro.senha) return alert("Preencha todos os campos.");
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: novoMembro.email,
            password: novoMembro.senha
        });
        if (authError) throw authError;

        const { error } = await supabase.from('usuarios').insert([{ 
            nome: novoMembro.nome, 
            email: novoMembro.email, 
            role: novoMembro.role 
        }]);
        if (error) throw error;

        setModalNovoUsuario(false); 
        setNovoMembro({ nome: "", email: "", senha: "", role: "colaborador" }); 
        buscarUsuarios();
    } catch (err: any) { 
        alert("ERRO AO CADASTRAR: " + (err.message || JSON.stringify(err)));
    }
  };

  const removerUsuario = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este acesso?")) {
        await supabase.from('usuarios').delete().eq('id', id);
        buscarUsuarios();
    }
  };

  // ================= CARDÁPIO E RECEITAS =================
  const abrirParaNovoProduto = () => { setProdutoEmEdicao(null);
    setNovoProd({ nome: "", categoria: "Bebidas", preco: "" }); setReceitaTemp([]); setModalNovoProduto(true); };
  const abrirParaEdicaoProduto = (p: any) => { setProdutoEmEdicao(p.id);
    setNovoProd({ nome: p.nome, categoria: p.categoria || "Bebidas", preco: p.preco?.toString() || "" }); setReceitaTemp(p.receita || []); setModalNovoProduto(true); };
  
  const adicionarIngrediente = () => {
    const insumo = insumosBase.find(i => i.id === ingredienteTemp.insumo_id);
    if(insumo && ingredienteTemp.qtd) {
        let qtdConvertida = parseFloat(String(ingredienteTemp.qtd).replace(',','.'));
        let custoIngrediente = qtdConvertida * insumo.custo_unidade;
        setReceitaTemp([...receitaTemp, { insumo_id: insumo.id, nome: insumo.nome, unidade: insumo.unidade, custo_unidade: insumo.custo_unidade, qtd: qtdConvertida, custo_calculado: custoIngrediente }]);
        setIngredienteTemp({ insumo_id: "", qtd: "" });
    }
  };

  const salvarProduto = async () => {
    try {
        const custoCalculado = receitaTemp.reduce((acc, ing) => acc + (ing.custo_calculado || 0), 0);
        const precoParsed = parseFloat(String(novoProd.preco).replace(',', '.'));
        const dados = { nome: novoProd.nome, categoria: novoProd.categoria, preco: isNaN(precoParsed) ?
        0 : precoParsed, custo: custoCalculado, receita: receitaTemp, un: "UN" };
        if (produtoEmEdicao) { const { error } = await supabase.from('produtos').update(dados).eq('id', produtoEmEdicao); if (error) throw error;
        } 
        else { const { error } = await supabase.from('produtos').insert([dados]);
        if (error) throw error; }
        setModalNovoProduto(false); buscarProdutos();
    } catch (err: any) { alert("ERRO (Produtos): " + (err.message || JSON.stringify(err))); }
  };

  // ================= LÓGICA DE FIADO =================
  const abrirGerenciadorFiado = (fiado: any) => {
      const itensDesmembrados: any[] = [];
      fiado.itens.forEach((item: any) => {
          for (let i = 0; i < (item.quantidade || 1); i++) {
              itensDesmembrados.push({ ...item, quantidade: 1 });
          }
      });
      setFiadoEmEdicao({ ...fiado, itens: itensDesmembrados });
      setItensSelecionadosFiado([]);
      setModalGerenciarFiado(true);
  };

  const alternarItemFiado = (idx: number) => {
      setItensSelecionadosFiado((prev: number[]) => 
          prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      );
  };

  const selecionarTodosFiado = () => {
      if (itensSelecionadosFiado.length === fiadoEmEdicao?.itens.length) {
          setItensSelecionadosFiado([]);
      } else {
          setItensSelecionadosFiado(fiadoEmEdicao?.itens.map((_: any, idx: number) => idx) || []);
      }
  };

  const receberPagamentoFiado = async () => {
      if (!fiadoEmEdicao || itensSelecionadosFiado.length === 0) {
          alert("Selecione pelo menos um item para receber pagamento.");
          return;
      }

      const itensParaPagar = fiadoEmEdicao.itens.filter((_: any, idx: number) => itensSelecionadosFiado.includes(idx));
      const itensRestantes = fiadoEmEdicao.itens.filter((_: any, idx: number) => !itensSelecionadosFiado.includes(idx));
      
      const totalPago = itensParaPagar.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
      const lucroPago = parseFloat((totalPago * 0.60).toFixed(2));
      const custoPago = parseFloat((totalPago - lucroPago).toFixed(2));

      const itensRestantesAgrupados: any[] = [];
      itensRestantes.forEach((item: any) => {
          const existente = itensRestantesAgrupados.find(i => i.id === item.id);
          if (existente) {
              existente.quantidade += 1;
          } else {
              itensRestantesAgrupados.push({ ...item });
          }
      });

      const novoTotal = itensRestantesAgrupados.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

      if (isOffline) {
          const novaVendaLocal = {
              id: Date.now(),
              total_venda: totalPago,
              custo_total: custoPago,
              lucro_total: lucroPago,
              cliente_nome: `Fiado Pago: ${fiadoEmEdicao.cliente_nome}`,
              mesa_numero: 0,
              itens: itensParaPagar,
              data_venda: new Date().toISOString()
          };
          setHistoricoVendas((prev: any[]) => [novaVendaLocal, ...prev]);

          if (itensRestantesAgrupados.length === 0) {
              setFiadosBase((prev: any[]) => prev.filter(f => f.id !== fiadoEmEdicao.id));
          } else {
              setFiadosBase((prev: any[]) => prev.map(f => f.id === fiadoEmEdicao.id ? { ...f, itens: itensRestantesAgrupados, total: novoTotal } : f));
          }

          registrarAcaoOffline({
              tipo: 'RECEBER_FIADO',
              payload: { fiadoId: fiadoEmEdicao.id, clienteNome: fiadoEmEdicao.cliente_nome, totalPago, custoPago, lucroPago, itensRestantesAgrupados, novoTotal, itensPagos: itensParaPagar },
              descricao: `Receber Fiado R$ ${totalPago.toFixed(2)} (${fiadoEmEdicao.cliente_nome})`
          });

          setModalGerenciarFiado(false); setFiadoEmEdicao(null); setItensSelecionadosFiado([]);
          return;
      }

      try {
          const { error: errVenda } = await supabase.from('vendas').insert([{ total_venda: totalPago, custo_total: custoPago, lucro_total: lucroPago, cliente_nome: `Fiado Pago: ${fiadoEmEdicao.cliente_nome}`, mesa_numero: 0, itens: itensParaPagar }]);
          if (errVenda) throw errVenda;

          if (itensRestantesAgrupados.length === 0) {
              const { error: errDelete } = await supabase.from('fiados').delete().eq('id', fiadoEmEdicao.id);
              if (errDelete) throw errDelete;
          } else {
              const { error: errUpdate } = await supabase.from('fiados').update({ itens: itensRestantesAgrupados, total: novoTotal }).eq('id', fiadoEmEdicao.id);
              if (errUpdate) throw errUpdate;
          }

          setModalGerenciarFiado(false); setFiadoEmEdicao(null); setItensSelecionadosFiado([]);
          buscarFiados(); buscarVendas();
          alert("Pagamento de fiado recebido com sucesso!");
      } catch (err) {
          alert("Erro ao receber o fiado.");
      }
  };

  // ================= FILTROS E CÁLCULOS CIRÚRGICOS DE CHECKOUT POR PESSOA =================
  const itensCheckoutExibidos = useMemo(() => {
    if (!mesaSelecionada?.itens) return [];
    if (modoFechamentoCheckout === "Todos") return mesaSelecionada.itens;
    return mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") === modoFechamentoCheckout);
  }, [mesaSelecionada, modoFechamentoCheckout]);

  const totalCheckoutCalculado = useMemo(() => {
    return itensCheckoutExibidos.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
  }, [itensCheckoutExibidos]);

  useEffect(() => {
    if (modalCheckoutAberto) {
      const qtd = pessoasSplit;
      const total = totalCheckoutCalculado;
      const valorBase = Math.floor((total / qtd) * 100) / 100;
      const d = parseFloat((total - (valorBase * qtd)).toFixed(2));
      setPagamentosSplit(Array.from({ length: qtd }).map((_, i) => ({ id: i + 1, valor: i === qtd - 1 ? valorBase + d : valorBase, metodo: "PIX" })));
    }
  }, [modoFechamentoCheckout, totalCheckoutCalculado, modalCheckoutAberto]);

  const handleSplitChange = (qtd: number) => {
    if (qtd < 1) return;
    setPessoasSplit(qtd);
    const total = totalCheckoutCalculado;
    const valorBase = Math.floor((total / qtd) * 100) / 100;
    const d = parseFloat((total - (valorBase * qtd)).toFixed(2));
    setPagamentosSplit(Array.from({ length: qtd }).map((_, i) => ({ id: i + 1, valor: i === qtd - 1 ? valorBase + d : valorBase, metodo: "PIX" })));
  };

  const alterarMetodoPagamento = (id: number, novoMetodo: string) => { setPagamentosSplit((prev: any[]) => prev.map(p => p.id === id ? { ...p, metodo: novoMetodo } : p)); };
  
  const abrirCheckout = () => { 
    setFichaMesaAberta(false); 
    setModoFechamentoCheckout("Todos");
    handleSplitChange(1); 
    setTimeout(() => setModalCheckoutAberto(true), 200); 
  };
  
  // Adiciona nova pessoa/aba diretamente em uma mesa ocupada
  const adicionarPessoaAMesaAberta = async () => {
    if (!mesaSelecionada) return;
    const novoNomeRaw = prompt("Digite o nome da nova pessoa para adicionar a esta mesa:");
    if (!novoNomeRaw) return;
    const novoNome = novoNomeRaw.trim().toUpperCase();
    
    const pessoasAtuais = getPessoasDaMesa(mesaSelecionada);
    if (pessoasAtuais.map(n => n.toUpperCase()).includes(novoNome)) {
      alert("Essa pessoa já está registrada nesta mesa.");
      return;
    }

    const novoClienteStr = mesaSelecionada.cliente ? `${mesaSelecionada.cliente} / ${novoNome}` : novoNome;
    const mesaAtualizada = { ...mesaSelecionada, cliente: novoClienteStr };

    if (isOffline) {
      setMesasReais((prev: any[]) => prev.map(m => m.id === mesaSelecionada.id ? mesaAtualizada : m));
      setMesaSelecionada(mesaAtualizada);
      setPessoaAtivaMesa(novoNome);
      alert(`Pessoa ${novoNome} adicionada localmente à mesa!`);
      return;
    }

    try {
      await supabase.from('mesas').update({ cliente: novoClienteStr }).eq('id', mesaSelecionada.id);
      setMesasReais((prev: any[]) => prev.map(m => m.id === mesaSelecionada.id ? mesaAtualizada : m));
      setMesaSelecionada(mesaAtualizada);
      setPessoaAtivaMesa(novoNome);
    } catch (err) {
      alert("Erro ao adicionar pessoa à mesa.");
    }
  };

  // Separa uma pessoa da mesa de volta para um avulso independente
  const separarPessoaParaAvulso = async (nomePessoa: string) => {
    if (!mesaSelecionada) return;
    if (confirm(`Deseja realmente separar todos os pedidos de ${nomePessoa} para uma nova comanda independente?`)) {
      const itensRestantes = mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") !== nomePessoa);
      const itensSeparados = mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") === nomePessoa);
      
      const totalRestante = itensRestantes.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
      const totalSeparado = itensSeparados.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

      const nomesAtuais = getPessoasDaMesa(mesaSelecionada);
      const nomesRestantes = nomesAtuais.filter(n => n !== nomePessoa);
      const novoClienteStr = nomesRestantes.join(" / ") || "Consumidor";

      const proxNum = mesasReais.filter(m => typeof m.numero === 'number').length > 0 ?
        Math.max(...mesasReais.map(m => m.numero)) + 1 : 1;

      const novaMesaAvulsa = {
        numero: proxNum,
        status: 'ocupada',
        cliente: nomePessoa,
        total: totalSeparado,
        itens: itensSeparados
      };

      if (isOffline) {
        const mesaOrigemAtualizada = { ...mesaSelecionada, cliente: novoClienteStr, total: totalRestante, itens: itensRestantes };
        const novaMesaComId = { ...novaMesaAvulsa, id: Date.now() };
        
        setMesasReais((prev: any[]) => [...prev.map(m => m.id === mesaSelecionada.id ? mesaOrigemAtualizada : m), novaMesaComId]);
        setMesaSelecionada(null);
        setFichaMesaAberta(false);
        alert(`Comanda de ${nomePessoa} separada localmente para a Mesa ${proxNum}!`);
        return;
      }

      try {
        await supabase.from('mesas').update({ cliente: novoClienteStr, total: totalRestante, itens: itensRestantes }).eq('id', mesaSelecionada.id);
        await supabase.from('mesas').insert([novaMesaAvulsa]);

        setMesaSelecionada(null);
        setFichaMesaAberta(false);
        buscarMesas();
        alert(`Comanda de ${nomePessoa} separada com sucesso para a Mesa ${proxNum}!`);
      } catch (err) {
          alert("Erro ao separar comanda.");
      }
    }
  };

  // Fusão refinada preservando os donos de cada item com perfeição
  const salvarEdicaoMesa = async () => {
    if (!mesaSelecionada) return;
    const novoNumParsed = parseInt(editMesaNum) || 0;
    const novoNome = editMesaCliente.trim() || "Avulso";
    const numAntigo = mesaSelecionada.numero;
    
    const mesaDestino = mesasReais.find(m => m.numero === novoNumParsed && m.id !== mesaSelecionada.id);
    
    if (isOffline) {
        if (mesaDestino) {
            const itensMesclados = [...mesaDestino.itens];
            mesaSelecionada.itens.forEach((itemNovo: any) => {
                const donoFinal = itemNovo.dono || novoNome;
                const index = itensMesclados.findIndex((i: any) => i.id === itemNovo.id && (i.dono || "Consumidor") === donoFinal);
                if (index >= 0) { itensMesclados[index].quantidade += itemNovo.quantidade; }
                else { itensMesclados.push({ ...itemNovo, dono: donoFinal }); }
            });
            const totalMesclado = (Number(mesaDestino.total) || 0) + (Number(mesaSelecionada.total) || 0);
            
            const nomesDestino = getPessoasDaMesa(mesaDestino);
            if (!nomesDestino.includes(novoNome)) nomesDestino.push(novoNome);
            const clienteMescladoStr = nomesDestino.join(" / ");

            setMesasReais((prev: any[]) => prev.filter(m => m.id !== mesaSelecionada.id).map(m => m.id === mesaDestino.id ? { ...m, total: totalMesclado, itens: itensMesclados, cliente: clienteMescladoStr } : m));
            setMesaSelecionada(null);
            setFichaMesaAberta(false);
            setModalEditarMesa(false);
            alert(`Comanda unida localmente à Mesa ${novoNumParsed}!`);
        } else {
            const pessoasAtuais = getPessoasDaMesa(mesaSelecionada);
            let itensAtualizados = mesaSelecionada.itens;
            if (pessoasAtuais.length <= 1) {
              itensAtualizados = mesaSelecionada.itens.map((i: any) => ({ ...i, dono: novoNome }));
            }
            const mesaAtualizada = { ...mesaSelecionada, numero: novoNumParsed || numAntigo, cliente: novoNome, itens: itensAtualizados };
            setMesasReais((prev: any[]) => prev.map(m => m.id === mesaSelecionada.id ? mesaAtualizada : m));
            setMesaSelecionada(mesaAtualizada);
            setModalEditarMesa(false);
            alert("Identificação atualizada localmente!");
        }
        return;
    }

    try {
        if (mesaDestino) {
            const itensMesclados = [...mesaDestino.itens];
            mesaSelecionada.itens.forEach((itemNovo: any) => {
                const donoFinal = itemNovo.dono || novoNome;
                const index = itensMesclados.findIndex((i: any) => i.id === itemNovo.id && (i.dono || "Consumidor") === donoFinal);
                if (index >= 0) { itensMesclados[index].quantidade += itemNovo.quantidade; }
                else { itensMesclados.push({ ...itemNovo, dono: donoFinal }); }
            });
            const totalMesclado = (Number(mesaDestino.total) || 0) + (Number(mesaSelecionada.total) || 0);
            
            const nomesDestino = getPessoasDaMesa(mesaDestino);
            if (!nomesDestino.includes(novoNome)) nomesDestino.push(novoNome);
            const clienteMescladoStr = nomesDestino.join(" / ");

            await supabase.from('mesas').update({ total: totalMesclado, itens: itensMesclados, cliente: clienteMescladoStr }).eq('id', mesaDestino.id);
            await supabase.from('mesas').delete().eq('id', mesaSelecionada.id);
            
            setMesaSelecionada(null);
            setFichaMesaAberta(false);
            setModalEditarMesa(false);
            buscarMesas();
            alert(`Comanda unida com sucesso à Mesa ${novoNumParsed}!`);
        } else {
            const numFinal = novoNumParsed || numAntigo;
            const pessoasAtuais = getPessoasDaMesa(mesaSelecionada);
            let itensAtualizados = mesaSelecionada.itens;
            if (pessoasAtuais.length <= 1) {
              itensAtualizados = mesaSelecionada.itens.map((i: any) => ({ ...i, dono: novoNome }));
            }
            await supabase.from('mesas').update({ numero: numFinal, cliente: novoNome, itens: itensAtualizados }).eq('id', mesaSelecionada.id);
            setMesaSelecionada((prev: any) => ({ ...prev, numero: numFinal, cliente: novoNome, itens: itensAtualizados }));
            setModalEditarMesa(false);
            buscarMesas();
            alert("Identificação atualizada com sucesso!");
        }
    } catch (err) {
        alert("Erro ao editar identificação da mesa.");
    }
  };

  const finalizarComoFiado = async () => {
    if (!mesaSelecionada) return;
    
    const isParcial = modoFechamentoCheckout !== "Todos";
    let nomeCliente = isParcial ? modoFechamentoCheckout : mesaSelecionada.cliente;
    
    if (!nomeCliente || nomeCliente.toLowerCase() === 'consumidor' || nomeCliente.toLowerCase() === 'avulso' || nomeCliente.includes('/')) {
        const inputNome = prompt("Digite o nome da pessoa para abrir ou adicionar ao Fiado:");
        if (!inputNome) return;
        nomeCliente = inputNome.trim().toUpperCase();
    } else {
        nomeCliente = nomeCliente.trim().toUpperCase();
    }

    const totalFiadoAtual = parseFloat(totalCheckoutCalculado.toFixed(2));
    const itensMesaFiado = itensCheckoutExibidos;

    if (isOffline) {
        setFiadosBase((prevFiados: any[]) => {
            const fiadoExistente = prevFiados.find(f => f.cliente_nome?.toLowerCase() === nomeCliente.toLowerCase());
            if (fiadoExistente) {
                const novoTotal = parseFloat(Number(fiadoExistente.total + totalFiadoAtual).toFixed(2));
                let itensMesclados = [...fiadoExistente.itens];
                itensMesaFiado.forEach((itemNovo: any) => {
                    const index = itensMesclados.findIndex((i: any) => i.id === itemNovo.id);
                    if (index >= 0) { itensMesclados[index].quantidade += itemNovo.quantidade; } 
                    else { itensMesclados.push({ ...itemNovo }); }
                });
                return prevFiados.map(f => f.id === fiadoExistente.id ? { ...f, total: novoTotal, itens: itensMesclados } : f);
            } else {
                const novoFiado = { id: Date.now(), cliente_nome: nomeCliente, total: totalFiadoAtual, itens: itensMesaFiado, data_criacao: new Date().toISOString() };
                return [novoFiado, ...prevFiados];
            }
        });

        if (isParcial) {
            const itensRestantes = mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") !== modoFechamentoCheckout);
            const totalRestante = itensRestantes.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
            const nomesAtuais = getPessoasDaMesa(mesaSelecionada);
            const novoClienteStr = nomesAtuais.filter(n => n !== modoFechamentoCheckout).join(" / ") || "Consumidor";
            
            const mesaAtualizada = { ...mesaSelecionada, cliente: novoClienteStr, total: totalRestante, itens: itensRestantes };
            setMesasReais((prev: any[]) => prev.map(m => m.id === mesaSelecionada.id ? mesaAtualizada : m));
        } else {
            setMesasReais((prev: any[]) => prev.filter(m => m.numero !== mesaSelecionada.numero));
        }

        registrarAcaoOffline({
            tipo: 'FINALIZAR_FIADO',
            payload: { nomeCliente, totalFiadoAtual, itensMesa: itensMesaFiado, mesaId: mesaSelecionada.id, mesaNumero: mesaSelecionada.numero, isParcial, modoFechamentoCheckout },
            descricao: `Lançar Fiado R$ ${totalFiadoAtual.toFixed(2)} para ${nomeCliente}`
        });

        setModalCheckoutAberto(false); 
        setMesaSelecionada(null);
        alert(`Ação gravada localmente (Offline) na conta de ${nomeCliente}!`);
        return;
    }

    try {
        const { data: fiadoExistente, error: errBusca } = await supabase
            .from('fiados')
            .select('*')
            .ilike('cliente_nome', nomeCliente)
            .maybeSingle();

        if (errBusca) throw errBusca;

        if (fiadoExistente) {
            const novoTotal = parseFloat(Number(fiadoExistente.total + totalFiadoAtual).toFixed(2));
            let itensMesclados = [...fiadoExistente.itens];

            itensMesaFiado.forEach((itemNovo: any) => {
                const index = itensMesclados.findIndex((i: any) => i.id === itemNovo.id);
                if (index >= 0) { 
                    itensMesclados[index].quantidade += itemNovo.quantidade; 
                } else { 
                    itensMesclados.push({ ...itemNovo }); 
                }
            });
            await supabase
                .from('fiados')
                .update({ total: novoTotal, itens: itensMesclados })
                .eq('id', fiadoExistente.id);

        } else {
            await supabase
                .from('fiados')
                .insert([{ cliente_nome: nomeCliente, total: totalFiadoAtual, itens: itensMesaFiado }]);
        }

        if (isParcial) {
            const itensRestantes = mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") !== modoFechamentoCheckout);
            const totalRestante = itensRestantes.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
            const nomesAtuais = getPessoasDaMesa(mesaSelecionada);
            const novoClienteStr = nomesAtuais.filter(n => n !== modoFechamentoCheckout).join(" / ") || "Consumidor";

            await supabase.from('mesas').update({ cliente: novoClienteStr, total: totalRestante, itens: itensRestantes }).eq('id', mesaSelecionada.id);
        } else {
            await supabase.from('mesas').delete().eq('id', mesaSelecionada.id);
        }

        setModalCheckoutAberto(false); setMesaSelecionada(null); buscarMesas(); buscarFiados();
        alert(`Fiado salvo com sucesso na conta de ${nomeCliente}!`);
    } catch (err: any) {
        alert("Erro ao lançar conta como fiado.");
    }
  };

  const finalizarPagamentoMesa = async () => {
    if (!mesaSelecionada) return;
    
    const isParcial = modoFechamentoCheckout !== "Todos";
    const itensVenda = itensCheckoutExibidos;
    const totalVenda = parseFloat(totalCheckoutCalculado.toFixed(2));
    const lucroVenda = parseFloat((totalVenda * 0.60).toFixed(2));
    const custoVenda = parseFloat((totalVenda - lucroVenda).toFixed(2));
    const mesaNum = mesaSelecionada.numero === "Avulso" ? 0 : parseInt(mesaSelecionada.numero) || 0;
    const nomeCliente = isParcial ? modoFechamentoCheckout : (mesaSelecionada.cliente || "Consumidor");

    if (isOffline) {
        const novaVendaLocal = {
            id: Date.now(),
            total_venda: totalVenda,
            custo_total: custoVenda,
            lucro_total: lucroVenda,
            cliente_nome: nomeCliente,
            mesa_numero: mesaNum,
            itens: itensVenda,
            data_venda: new Date().toISOString()
        };
        setHistoricoVendas((prev: any[]) => [novaVendaLocal, ...prev]);

        if (isParcial) {
            const itensRestantes = mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") !== modoFechamentoCheckout);
            const totalRestante = itensRestantes.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
            const nomesAtuais = getPessoasDaMesa(mesaSelecionada);
            const novoClienteStr = nomesAtuais.filter(n => n !== modoFechamentoCheckout).join(" / ") || "Consumidor";
            
            const mesaAtualizada = { ...mesaSelecionada, cliente: novoClienteStr, total: totalRestante, itens: itensRestantes };
            setMesasReais((prev: any[]) => prev.map(m => m.id === mesaSelecionada.id ? mesaAtualizada : m));
        } else {
            setMesasReais((prev: any[]) => prev.filter(m => m.id !== mesaSelecionada.id));
        }
        
        registrarAcaoOffline({
            tipo: 'FINALIZAR_PAGAMENTO',
            payload: { totalVenda, custoVenda, lucroVenda, nomeCliente, mesaNum, mesaId: mesaSelecionada.id, mesaNumero: mesaSelecionada.numero, itensVenda, isParcial, modoFechamentoCheckout },
            descricao: `Encerrar Pago R$ ${totalVenda.toFixed(2)} (${nomeCliente})`
        });

        setModalCheckoutAberto(false); 
        setMesaSelecionada(null);
        return;
    }

    try {
        await supabase.from('vendas').insert([{ total_venda: totalVenda, custo_total: custoVenda, lucro_total: lucroVenda, cliente_nome: nomeCliente, mesa_numero: mesaNum, itens: itensVenda || [] }]);

        if (isParcial) {
            const itensRestantes = mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") !== modoFechamentoCheckout);
            const totalRestante = itensRestantes.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
            const nomesAtuais = getPessoasDaMesa(mesaSelecionada);
            const novoClienteStr = nomesAtuais.filter(n => n !== modoFechamentoCheckout).join(" / ") || "Consumidor";

            await supabase.from('mesas').update({ cliente: novoClienteStr, total: totalRestante, itens: itensRestantes }).eq('id', mesaSelecionada.id);
        } else {
            await supabase.from('mesas').delete().eq('id', mesaSelecionada.id);
        }
        
        setModalCheckoutAberto(false); setMesaSelecionada(null); buscarMesas(); setTimeout(() => buscarVendas(), 400); 
    } catch (err: any) { alert("ERRO SUPABASE (Vendas)."); }
  };

  const cancelarMesa = async (mesa: any, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (usuarioAtual?.role !== 'gerente') {
      alert("Apenas o gerente pode excluir uma mesa.");
      return;
    }
    if (confirm(`ATENÇÃO: Deseja realmente excluir a Mesa ${mesa.numero}? \n\nTodos os pedidos serão apagados e o estoque retornado.`)) {
      try {
        if (mesa.itens && mesa.itens.length > 0) {
          for (const item of mesa.itens) {
            const p = produtosBase.find(pb => pb.id === item.id);
            if (p && p.receita && Array.isArray(p.receita)) {
              for (const ing of p.receita) {
                const insumo = insumosBase.find(i => i.id === ing.insumo_id);
                if (insumo) {
                  let qtdUsada = parseFloat(ing.qtd) * item.quantidade;
                  const novoEstoque = insumo.estoque + qtdUsada; 
                  await supabase.from('insumos').update({ estoque: novoEstoque }).eq('id', insumo.id);
                }
              }
            }
          }
        }
        const { error } = await supabase.from('mesas').delete().eq('id', mesa.id);
        if (error) throw error;

        buscarMesas();
        buscarInsumos();
        alert("Mesa excluída com sucesso!");
      } catch(err: any) {
        alert("Erro ao excluir mesa.");
      }
    }
  };

  const estornarItemDaComanda = async (mesa: any, indexItem: number, item: any) => {
    if (usuarioAtual?.role !== 'gerente') {
      alert("Apenas o gerente pode estornar itens da comanda.");
      return;
    }
    if (confirm(`Deseja remover "${item.quantidade}x ${item.nome}" da comanda?`)) {
      try {
        const p = produtosBase.find(pb => pb.id === item.id);
        if (p && p.receita && Array.isArray(p.receita)) {
          for (const ing of p.receita) {
            const insumo = insumosBase.find(i => i.id === ing.insumo_id);
            if (insumo) {
              let qtdUsada = parseFloat(ing.qtd) * item.quantidade;
              const novoEstoque = insumo.estoque + qtdUsada;
              await supabase.from('insumos').update({ estoque: novoEstoque }).eq('id', insumo.id);
            }
          }
        }

        const novosItens = [...mesa.itens];
        novosItens.splice(indexItem, 1); 
        const valorDescontado = item.preco * item.quantidade;
        const novoTotal = Math.max(0, mesa.total - valorDescontado);

        const { error } = await supabase.from('mesas').update({ itens: novosItens, total: novoTotal }).eq('id', mesa.id);
        if (error) throw error;

        setMesaSelecionada({ ...mesa, itens: novosItens, total: novoTotal });
        buscarMesas();
        buscarInsumos();
      } catch(err: any) {
        alert("Erro ao estornar item.");
      }
    }
  };

  // ================= SALÃO E OPERAÇÕES =================
  const adicionarMesaSalao = async () => {
    try {
        const prox = mesasReais.filter(m => typeof m.numero === 'number').length > 0 ?
        Math.max(...mesasReais.map(m => m.numero)) + 1 : 1;
        const { error } = await supabase.from('mesas').insert([{ numero: prox, status: 'livre', total: 0, itens: [] }]);
        if (error) throw error; buscarMesas();
    } catch (err: any) { alert("ERRO SUPABASE (Adicionar Mesa)."); }
  };
  
  const interagirComMesa = (mesa: any) => {
    if (mesa.status === "livre") { 
        setInputMesaNova(mesa.numero.toString()); 
        setInputNomeCliente(""); 
        setTipoAtendimento("mesa"); 
        setModalNovaComanda(true);
    } else { 
        setMesaSelecionada(mesa); 
        const pessoas = getPessoasDaMesa(mesa);
        setPessoaAtivaMesa(pessoas[0] || "Consumidor");
        setFichaMesaAberta(true); 
    }
  };

  const abrirNovoAtendimento = () => { setInputMesaNova(""); setInputNomeCliente("");
    setTipoAtendimento("avulso"); setModalNovaComanda(true); };

  const iniciarAtendimento = async () => {
    let novaMesa: any = null;
    const numMesaParsed = parseInt(inputMesaNova) || 0;
    const prox = mesasReais.filter(m => typeof m.numero === 'number').length > 0 ?
      Math.max(...mesasReais.map(m => m.numero)) + 1 : 1;

    if (tipoAtendimento === "mesa") {
        const mesaExiste = mesasReais.find(m => m.numero.toString() === inputMesaNova);
        if (mesaExiste) {
            novaMesa = { ...mesaExiste, status: 'ocupada', cliente: inputNomeCliente };
        } else {
            novaMesa = { id: Date.now(), numero: numMesaParsed, status: 'ocupada', cliente: inputNomeCliente, total: 0, itens: [] };
        }
    } else {
        novaMesa = { id: Date.now(), numero: prox, status: 'ocupada', cliente: inputNomeCliente || "Avulso", total: 0, itens: [] };
    }

    if (isOffline) {
        setMesasReais((prev: any[]) => {
            const existe = prev.find(m => m.numero === novaMesa.numero);
            if (existe) return prev.map(m => m.numero === novaMesa.numero ? novaMesa : m);
            return [...prev, novaMesa];
        });
        setMesaSelecionada(novaMesa);
        setModalNovaComanda(false);
        setPedidoAtual([]);
        registrarAcaoOffline({
            tipo: 'INICIAR_ATENDIMENTO',
            payload: { novaMesa, tipoAtendimento, inputMesaNova, inputNomeCliente },
            descricao: `Abertura da Mesa ${novaMesa.numero} (${novaMesa.cliente})`
        });
        setTimeout(() => { setBuscaProduto(""); setCategoriaAtiva("Todas"); setMenuLateralAberto(true); }, 150);
        return;
    }

    try {
        let nMesa = null;
        if (tipoAtendimento === "mesa") {
            const mesaExiste = mesasReais.find(m => m.numero.toString() === inputMesaNova);
            if (mesaExiste) {
                const { error } = await supabase.from('mesas').update({ status: 'ocupada', cliente: inputNomeCliente }).eq('numero', inputMesaNova);
                if(error) throw error; nMesa = { ...mesaExiste, status: 'ocupada', cliente: inputNomeCliente };
            } else {
                const { data, error } = await supabase.from('mesas').insert([{ numero: parseInt(inputMesaNova), status: 'ocupada', cliente: inputNomeCliente, total: 0, itens: [] }]).select();
                if(error) throw error; if (data) nMesa = data[0];
            }
        } else {
            const { data, error } = await supabase.from('mesas').insert([{ numero: prox, status: 'ocupada', cliente: inputNomeCliente || "Avulso", total: 0, itens: [] }]).select();
            if(error) throw error; if (data) nMesa = data[0];
        }
        setMesaSelecionada(nMesa); setModalNovaComanda(false); setPedidoAtual([]); buscarMesas();
        setTimeout(() => { setBuscaProduto(""); setCategoriaAtiva("Todas"); setMenuLateralAberto(true); }, 150);
    } catch (err: any) { alert("ERRO SUPABASE (Abertura de Mesa)."); }
  };

  const adicionarItem = (p: any) => { setPedidoAtual((prev: any[]) => { const e = prev.find(i => i.id === p.id); return e ? prev.map(i => i.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i) : [...prev, { ...p, quantidade: 1 }]; }); };
  const removerItem = (id: string) => { setPedidoAtual((prev: any[]) => { const e = prev.find(i => i.id === id); return e && e.quantidade > 1 ? prev.map(i => i.id === id ? { ...i, quantidade: i.quantidade - 1 } : i) : prev.filter(i => i.id !== id); }); };

  // ================= INTEGRAÇÃO KDS E BAIXA ESTOQUE =================
  const confirmarEEnviarPedido = async () => {
    const numMesaApoio = mesaSelecionada?.numero || inputMesaNova || "Avulso";
    const clienteApoio = mesaSelecionada?.cliente || inputNomeCliente || "Cliente";
    
    const totalRemessa = pedidoAtual.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    const totalNovo = (Number(mesaSelecionada?.total) || 0) + totalRemessa;
    const itensAntigos = mesaSelecionada?.itens || [];
    let itensAtualizados = [...itensAntigos];
    
    // Anexa a pessoa ativa da mesa como dona do produto lançado
    pedidoAtual.forEach(itemNovo => {
        const donoNovo = pessoaAtivaMesa === "Todos" ? (getPessoasDaMesa(mesaSelecionada)[0] || "Consumidor") : pessoaAtivaMesa;
        const index = itensAtualizados.findIndex((i: any) => i.id === itemNovo.id && (i.dono || "Consumidor") === donoNovo);
        if (index >= 0) { 
            itensAtualizados[index].quantidade += itemNovo.quantidade; 
        } else { 
            itensAtualizados.push({ ...itemNovo, dono: donoNovo }); 
        }
    });

    if (pedidoAtual.length > 0) {
        const novoPedidoCozinha = { id: Date.now().toString(), mesa: numMesaApoio, cliente: clienteApoio, itens: [...pedidoAtual], hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
        setPedidosPendentes((prev: any[]) => [...prev, novoPedidoCozinha]);
        if (usuarioAtual?.role === 'gerente') tocarSomAlerta();
    }

    if (isOffline) {
        const mesaAtualizadaLocal = { ...mesaSelecionada, total: totalNovo, itens: itensAtualizados };
        if (mesaSelecionada) setMesaSelecionada(mesaAtualizadaLocal);
        setMesasReais((prev: any[]) => prev.map(m => m.numero === mesaAtualizadaLocal.numero ? { ...m, total: totalNovo, itens: itensAtualizados } : m));

        setInsumosBase((prevInsumos: any[]) => {
            let insumosCopia = [...prevInsumos];
            for (const item of pedidoAtual) {
                const p = produtosBase.find(pb => pb.id === item.id);
                if (p && p.receita && Array.isArray(p.receita)) {
                    for (const ing of p.receita) {
                        const idx = insumosCopia.findIndex(i => i.id === ing.insumo_id);
                        if (idx >= 0) {
                            let qtdUsada = parseFloat(ing.qtd) * item.quantidade;
                            insumosCopia[idx] = { ...insumosCopia[idx], estoque: insumosCopia[idx].estoque - qtdUsada };
                        }
                    }
                }
            }
            return insumosCopia;
        });

        registrarAcaoOffline({
            tipo: 'ENVIAR_PEDIDO',
            payload: { mesaNumero: numMesaApoio, totalNovo, itensAtualizados, pedidoAtual },
            descricao: `Lançar R$ ${totalRemessa.toFixed(2)} na Mesa ${numMesaApoio}`
        });

        setModalConfirmacaoAberto(false);
        setMenuLateralAberto(false); 
        setPedidoAtual([]);
        return;
    }

    try {
        const mesaId = mesaSelecionada?.id || mesasReais.find(m => m.numero == inputMesaNova)?.id;
        await supabase.from('mesas').update({ total: totalNovo, itens: itensAtualizados }).eq('id', mesaId);
        if (mesaSelecionada) setMesaSelecionada({ ...mesaSelecionada, total: totalNovo, itens: itensAtualizados });
        
        for (const item of pedidoAtual) {
          const p = produtosBase.find(pb => pb.id === item.id);
          if (p && p.receita && Array.isArray(p.receita)) {
              for (const ing of p.receita) {
                  const insumo = insumosBase.find(i => i.id === ing.insumo_id);
                  if (insumo) {
                      let qtdUsada = parseFloat(ing.qtd) * item.quantidade;
                      const novoEstoque = insumo.estoque - qtdUsada;
                      await supabase.from('insumos').update({ estoque: novoEstoque }).eq('id', insumo.id);
                  }
              }
          }
        }
        
        setModalConfirmacaoAberto(false);
        setMenuLateralAberto(false); setPedidoAtual([]); buscarInsumos(); buscarMesas();
    } catch(err: any) { alert("ERRO SUPABASE (Lançar Pedido)."); }
  };
  
  const itensExibidosCardapio = produtosBase.filter(item => {
    const matchBusca = item.nome.toLowerCase().includes(buscaProduto.toLowerCase());
    const matchCat = categoriaAtiva === "Todas" || item.categoria === categoriaAtiva;
    return matchBusca && matchCat;
  });

  // Filtros de visualização granular para as abas de consumo da mesa ocupada
  const itensExibidosMesa = useMemo(() => {
    if (!mesaSelecionada?.itens) return [];
    if (pessoaAtivaMesa === "Todos") return mesaSelecionada.itens;
    return mesaSelecionada.itens.filter((i: any) => (i.dono || "Consumidor") === pessoaAtivaMesa);
  }, [mesaSelecionada, pessoaAtivaMesa]);

  const subtotalPessoaAtiva = useMemo(() => {
    return itensExibidosMesa.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);
  }, [itensExibidosMesa]);

  // ================= TELA DE LOGIN MESTRE =================
  if (!usuarioAtual) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6" style={{ backgroundImage: "radial-gradient(circle at center, #18181b 0%, #09090b 100%)" }}>
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex flex-col items-center mb-10">
              <div className="h-28 w-28 relative rounded-full overflow-hidden border border-yellow-500/30 bg-black flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                <Image src="/logo.png" alt="Logo Bar da Praça" fill className="object-contain p-2" />
              </div>
              <h1 className="text-3xl font-black text-yellow-500 italic uppercase tracking-tighter">Bar da Praça</h1>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-2">Acesso ao Sistema</p>
           </div>

           {isRegistering ? (
             <form onSubmit={registrarGerente} className="space-y-6 animate-in fade-in">
                <div className="space-y-2">
                   <Label className="text-zinc-500 font-black uppercase text-[10px] ml-2 tracking-widest">Nome do Gerente</Label>
                   <Input value={regNome} onChange={e => setRegNome(e.target.value)} placeholder="Seu nome..." className="bg-zinc-950 border-zinc-800 h-14 rounded-2xl text-zinc-50 font-bold px-6 focus:border-yellow-500" />
                </div>
                <div className="space-y-2">
                   <Label className="text-zinc-500 font-black uppercase text-[10px] ml-2 tracking-widest">Email (Login)</Label>
                   <Input value={regEmail} onChange={e => setRegEmail(e.target.value)} type="email" placeholder="seu@email.com" className="bg-zinc-950 border-zinc-800 h-14 rounded-2xl text-zinc-50 font-bold px-6 focus:border-yellow-500" />
                </div>
                <div className="space-y-2">
                   <Label className="text-zinc-500 font-black uppercase text-[10px] ml-2 tracking-widest">Senha Forte</Label>
                   <Input value={regSenha} onChange={e => setRegSenha(e.target.value)} type="password" placeholder="••••••••" className="bg-zinc-950 border-zinc-800 h-14 rounded-2xl text-zinc-50 font-bold px-6 focus:border-yellow-500" />
                </div>
                <button type="submit" className="w-full mt-4 bg-yellow-500 text-zinc-950 font-black py-4 rounded-2xl text-lg italic uppercase shadow-xl hover:bg-yellow-400 active:scale-95 transition-all">Criar Acesso</button>
                <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase mt-2">Voltar para Login</button>
             </form>
           ) : (
             <form onSubmit={efetuarLogin} className="space-y-6 animate-in fade-in">
                <div className="space-y-2">
                   <Label className="text-zinc-500 font-black uppercase text-[10px] ml-2 tracking-widest">Email de Acesso</Label>
                   <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <Input value={loginUsuario} onChange={e => setLoginUsuario(e.target.value)} type="email" placeholder="email@bar.com" className="bg-zinc-950 border-zinc-800 h-14 rounded-2xl text-zinc-50 font-bold pl-12 focus:border-yellow-500 transition-colors" />
                   </div>
                </div>
                <div className="space-y-2">
                   <Label className="text-zinc-500 font-black uppercase text-[10px] ml-2 tracking-widest">Senha</Label>
                   <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <Input type="password" value={loginSenha} onChange={e => setLoginSenha(e.target.value)} placeholder="••••••••" className="bg-zinc-950 border-zinc-800 h-14 rounded-2xl text-zinc-50 font-bold pl-12 focus:border-yellow-500 transition-colors" />
                   </div>
                </div>
                
                <div className="flex items-center justify-between px-2 pt-2">
                   <label className="flex items-center gap-2 cursor-pointer group">
                       <input type="checkbox" checked={lembrarSenha} onChange={e => setLembrarSenha(e.target.checked)} className="accent-yellow-500 w-4 h-4 rounded-sm bg-zinc-950 border-zinc-800 cursor-pointer" />
                      <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-zinc-300 transition-colors">Lembrar Senha</span>
                   </label>
                  <button type="button" onClick={() => setIsRegistering(true)} className="text-[10px] font-black uppercase text-yellow-500 hover:text-yellow-400 transition-colors">Criar Conta Mestre</button>
                </div>

                <button type="submit" className="w-full mt-4 bg-yellow-500 text-zinc-950 font-black py-4 rounded-2xl text-lg italic uppercase shadow-xl hover:bg-yellow-400 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <LogIn size={20} /> Entrar no Sistema
                </button>
             </form>
           )}
        </div>
      </div>
    );
  }

  // ================= TELA DO SISTEMA PRINCIPAL =================
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans pb-10" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 flex flex-col md:flex-row justify-between items-center backdrop-blur-md sticky top-0 z-10 gap-4 print:hidden">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 relative rounded-full overflow-hidden border border-yellow-500/30 bg-black flex items-center justify-center">
                 <Image src="/logo.png" alt="Logo" fill className="object-contain p-1" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-yellow-500 italic uppercase">Bar da Praça</h1>
                <p className="text-xs text-zinc-400">Turno da Noite</p>
            </div>
          </div>
          <div className="md:hidden flex flex-col items-end">
             <span className="text-[10px] font-black uppercase text-zinc-500 leading-tight">{usuarioAtual?.role}</span>
             <button onClick={efetuarLogout} className="text-[10px] text-red-500 font-black uppercase mt-1">Sair</button>
          </div>
        </div>

        {/* BANNER DE STATUS ONLINE / OFFLINE INTELIGENTE COM BOTÃO DE FORÇAR */}
        <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 w-full md:w-auto justify-center">
            <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isOffline ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
            
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    {isOffline ? 'Modo Local' : 'Online'}
                </span>
                <label className="flex items-center gap-1 cursor-pointer mt-0.5">
                    <input type="checkbox" checked={isOffline} onChange={e => setIsOffline(e.target.checked)} className="accent-orange-500 w-2.5 h-2.5 bg-zinc-900 border-zinc-700 rounded cursor-pointer" />
                    <span className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300">Forçar Offline</span>
                </label>
            </div>

            {syncQueue.length > 0 && (
                <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/30 font-black text-[9px] px-1.5 ml-1">
                    {syncQueue.length} PENDENTE{syncQueue.length > 1 ? 'S' : ''}
                </Badge>
            )}

            {syncQueue.length > 0 && (
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-zinc-800">
                    <button onClick={sincronizarFilaOffline} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-[9px] font-black uppercase transition-all shadow flex items-center gap-1">
                        <RefreshCw size={8} /> Sync
                    </button>
                    <button onClick={limparFilaOffline} className="text-zinc-600 hover:text-red-500 p-1 transition-colors" title="Descartar Fila Local">
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </div>

        <nav className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full md:w-auto overflow-x-auto">
          <button onClick={() => setVisaoAtiva("salao")} className={`flex-1 px-6 py-2 rounded-lg font-bold text-xs uppercase transition-all ${visaoAtiva === "salao" ? "bg-zinc-800 text-yellow-500 shadow-inner" : "text-zinc-500"}`}>Salão</button>
          
          {usuarioAtual?.role === 'gerente' && (
            <>
              <button onClick={() => setVisaoAtiva("gestao")} className={`flex-1 px-6 py-2 rounded-lg font-bold text-xs uppercase transition-all ${visaoAtiva === "gestao" ? "bg-zinc-800 text-yellow-500 shadow-inner" : "text-zinc-500"}`}>Gestão ERP</button>
              <button onClick={() => setVisaoAtiva("financeiro")} className={`flex-1 px-6 py-2 rounded-lg font-bold text-xs uppercase transition-all ${visaoAtiva === "financeiro" ? "bg-zinc-800 text-yellow-500 shadow-inner" : "text-zinc-500"}`}>Financeiro</button>
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3 bg-zinc-950 p-2 pr-4 rounded-xl border border-zinc-800">
           <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700">
              <User size={14} className="text-yellow-500" />
           </div>
           <div className="flex flex-col pr-4 border-r border-zinc-800">
             <span className="text-[9px] font-black uppercase text-zinc-500 leading-tight tracking-widest">{usuarioAtual?.role}</span>
             <span className="text-xs font-bold text-zinc-200 leading-tight truncate max-w-[120px]">{usuarioAtual?.nome}</span>
           </div>
           <button onClick={efetuarLogout} className="text-[10px] text-red-500 hover:text-red-400 font-black uppercase transition-colors">Sair</button>
        </div>
      </header>

      {/* FINANCEIRO CONSOLIDADO */}
      {visaoAtiva === "financeiro" && usuarioAtual?.role === 'gerente' && (
        <main className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800 print:border-none print:p-0 print:bg-transparent">
            <div className="flex items-center gap-4"><CalendarIcon className="text-yellow-500" size={32}/><div className="leading-none"><p className="text-xs font-black text-yellow-500 uppercase">{diaSemana}</p><p className="text-xl font-black">{dataFormatada}</p></div></div>
            
            <div className="flex items-center gap-4 flex-wrap print:hidden justify-center">
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex-wrap justify-center items-center gap-1">
                    {["dia", "semana", "mes", "ano", "custom"].map(p => (
                        <button key={p} onClick={() => setPeriodoFiltro(p as any)} className={`px-3 py-2 rounded-lg text-xs font-black uppercase transition-all ${periodoFiltro === p ? 'bg-yellow-500 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            {p === 'custom' ? 'Período Específico' : p}
                        </button>
                    ))}
                </div>

                {periodoFiltro === 'custom' && (
                    <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-yellow-500/50 animate-in fade-in">
                        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-zinc-900 border-zinc-800 text-xs font-bold h-9 w-32 rounded-lg text-yellow-500" title="Data Inicial" />
                        <span className="text-zinc-500 text-xs font-bold">até</span>
                        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-zinc-900 border-zinc-800 text-xs font-bold h-9 w-32 rounded-lg text-yellow-500" title="Data Final (Opcional)" />
                    </div>
                )}

                <button onClick={() => window.print()} className="bg-yellow-500 text-zinc-950 px-4 py-2 rounded-xl font-black uppercase text-xs flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-lg"><Printer size={16} /> Relatório PDF</button>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl print:border-zinc-300"><p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Faturamento</p><p className="text-3xl font-black text-white italic print:text-black">R$ {fatTotal.toFixed(2)}</p></div>
            <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl print:border-zinc-300"><p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Lucro Estimado</p><p className="text-3xl font-black text-green-500 italic">R$ {lucTotal.toFixed(2)}</p></div>
             <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl print:border-zinc-300"><p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Margem Real</p><p className="text-3xl font-black text-yellow-500 italic">{margem.toFixed(1)}%</p></div>
            <div className="bg-red-950/20 p-6 rounded-[2rem] border border-red-900/30 shadow-xl print:border-zinc-300 print:bg-white"><p className="text-red-500 text-[10px] font-black uppercase mb-1">Desperdício / Perdas</p><p className="text-3xl font-black text-red-500 italic">R$ {totalPerdasFin.toFixed(2)}</p></div>
            <div className="bg-orange-950/20 p-6 rounded-[2rem] border border-orange-900/30 shadow-xl print:border-zinc-300 print:bg-white"><p className="text-orange-500 text-[10px] font-black uppercase mb-1">Fiados na Praça</p><p className="text-3xl font-black text-orange-500 italic">R$ {totalFiadosFin.toFixed(2)}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                
                <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 h-[380px] shadow-2xl print:border-zinc-300">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-white uppercase italic flex items-center gap-2 print:text-black"><TrendingUp className="text-yellow-500" size={20}/> Evolução</h3>
                        <div className="flex gap-4 text-xs font-bold">
                            <span className="text-yellow-500 flex items-center gap-1"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full inline-block" /> Receitas</span>
                            <span className="text-red-500 flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" /> Quebras/Perdas</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dadosGrafico}>
                            <defs>
                                <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="data" stroke="#71717a" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '1rem' }} />
                            <Area type="monotone" dataKey="valor" stroke="#eab308" fill="url(#colorV)" strokeWidth={4} name="Faturamento" />
                            <Area type="monotone" dataKey="perda" stroke="#ef4444" fill="url(#colorP)" strokeWidth={3} name="Desperdício" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden print:border-zinc-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-white uppercase italic flex items-center gap-2 print:text-black">
                            <History className="text-yellow-500" size={20}/> Relatório de {periodoFiltro === 'custom' ? 'Período Específico' : periodoFiltro}
                        </h3>
                        <span className="text-[10px] text-zinc-500 font-bold italic">Clique para abrir detalhes</span>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide print:max-h-none print:overflow-visible">
                        {historicoAgrupado.length === 0 ? <p className="text-zinc-600 italic text-center py-6 font-black uppercase">Sem dados</p> : (
                          historicoAgrupado.map((v: any, idx) => (
                            <div key={idx} onClick={() => !v.isConsolidated && setVendaDetalhe(v)} className={`bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center transition-all ${!v.isConsolidated ? 'cursor-pointer hover:border-yellow-500/50 hover:bg-zinc-900/50' : ''} print:bg-white print:border-zinc-300`}>
                                {v.isConsolidated ? (
                                 <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-yellow-500 print:border-zinc-300 print:bg-white"><CalendarIcon size={16}/></div><div><p className="font-black text-zinc-200 uppercase text-xs print:text-black">{v.key}</p><p className="text-[10px] text-zinc-500">{v.count} Mesas Fechadas</p></div></div>
                                ) : (
                                 <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-yellow-500 print:border-zinc-300 print:bg-white"><Receipt size={16}/></div><div><p className="font-black text-zinc-200 uppercase text-xs print:text-black">{v.cliente_nome}</p><p className="text-[10px] text-zinc-500">{new Date(v.data_venda).toLocaleTimeString()} - Mesa {v.mesa_numero || 'Avulsa'}</p></div></div>
                                )}
                                <div className="text-right"><p className="font-black text-white print:text-black">R$ {v.isConsolidated ? v.total.toFixed(2) : Number(v.total_venda).toFixed(2)}</p></div>
                            </div>
                          ))
                        )}
                    </div>
                </div>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-[2.5rem] p-8 h-fit shadow-2xl print:border-zinc-300 print:bg-white">
              <div className="flex items-center gap-3 mb-6"><BrainCircuit className="text-yellow-500" size={32} /><h3 className="text-xl font-black text-yellow-500 uppercase italic">IA Coach</h3></div>
              <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 print:bg-white print:border-zinc-300"><p className="text-yellow-500 font-black uppercase text-[9px] mb-2 tracking-widest">Status</p><p className="text-zinc-300 text-sm italic print:text-black">{fatTotal > 0 ? `Sua margem de ${margem.toFixed(1)}% está excelente. Atenção às perdas de R$ ${totalPerdasFin.toFixed(2)} no período.` : "Aguardando dados para iniciar análise."}</p></div>
            </div>
          </div>
        </main>
      )}

      {/* GESTÃO ERP */}
      {visaoAtiva === "gestao" && usuarioAtual?.role === 'gerente' && (
        <main className="p-6 max-w-7xl mx-auto">
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 mb-8 w-fit overflow-x-auto">
              <button onClick={() => setVisaoGestao("cardapio")} className={`px-6 py-3 rounded-xl font-black uppercase text-xs transition-all ${visaoGestao === "cardapio" ? "bg-yellow-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}>Cardápio</button>
              <button onClick={() => setVisaoGestao("estoque")} className={`px-6 py-3 rounded-xl font-black uppercase text-xs transition-all ${visaoGestao === "estoque" ? "bg-yellow-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}>Estoque Real</button>
              <button onClick={() => setVisaoGestao("perdas")} className={`px-6 py-3 rounded-xl font-black uppercase text-xs transition-all ${visaoGestao === "perdas" ? "bg-red-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}>Registrar Perdas</button>
              <button onClick={() => setVisaoGestao("fiados")} className={`px-6 py-3 rounded-xl font-black uppercase text-xs transition-all ${visaoGestao === "fiados" ? "bg-orange-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}><BookOpen size={14} className="inline mr-1"/> Fiados</button>
              <button onClick={() => setVisaoGestao("equipe")} className={`px-6 py-3 rounded-xl font-black uppercase text-xs transition-all ${visaoGestao === "equipe" ? "bg-blue-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}><Users size={14} className="inline mr-1"/> Equipe / Acessos</button>
          </div>

          {/* SUB-ABA FIADOS */}
          {visaoGestao === "fiados" && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase italic tracking-tighter text-orange-500">Caderneta de Fiados</h2></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <table className="w-full text-left font-bold text-sm">
                      <thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                          <tr><th className="p-6">Cliente (Devedor)</th><th className="p-6">Data de Abertura</th><th className="p-6 text-orange-500">Valor Pendente</th><th className="p-6 text-center">Ações</th></tr>
                      </thead>
                      <tbody>
                          {fiadosBase.length === 0 ? (
                              <tr><td colSpan={4} className="p-6 text-center text-zinc-500 italic uppercase font-black">Nenhum fiado pendente na praça.</td></tr>
                          ) : (
                              fiadosBase.map(f => (
                                  <tr key={f.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                                      <td className="p-6 font-black uppercase text-zinc-200">{f.cliente_nome}</td>
                                      <td className="p-6 text-zinc-500 text-xs">{new Date(f.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                      <td className="p-6 text-orange-500 font-black italic text-lg">R$ {Number(f.total).toFixed(2)}</td>
                                      <td className="p-6 text-center"><button onClick={() => abrirGerenciadorFiado(f)} className="bg-orange-600/20 text-orange-500 border border-orange-500/50 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-orange-500 hover:text-white transition-all">Receber Pagamento</button></td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* SUB-ABA CARDÁPIO */}
          {visaoGestao === "cardapio" && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Itens do Cardápio</h2><button onClick={abrirParaNovoProduto} className="bg-zinc-100 text-zinc-950 font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white shadow-2xl transition-all"><Plus size={18}/> NOVO PRODUTO</button></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"><table className="w-full text-left font-bold text-sm"><thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800"><tr><th className="p-6">Produto</th><th className="p-6">Categoria</th><th className="p-6 text-yellow-500">Venda</th><th className="p-6 text-center">Ações</th></tr></thead><tbody>{produtosBase.map(p => (<tr key={p.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors"><td className="p-6 font-black uppercase">{p.nome}</td><td className="p-6 text-zinc-400 text-xs uppercase">{p.categoria}</td><td className="p-6 text-yellow-500 font-black italic text-lg">R$ {p.preco.toFixed(2)}</td><td className="p-6 text-center"><button onClick={() => abrirParaEdicaoProduto(p)} className="p-2 text-zinc-500 hover:text-yellow-500 transition-all"><Edit size={18}/></button></td></tr>))}</tbody></table></div>
            </div>
          )}

          {/* SUB-ABA ESTOQUE */}
          {visaoGestao === "estoque" && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Insumos e Matéria Prima</h2><button onClick={() => { setInsumoEmEdicao(null);
              setNovoInsumo({ nome: "", formato: "unidade", custo_formato: "", qtd_comprada: "", rendimento: "" }); setModalNovoInsumo(true);
              }} className="bg-zinc-100 text-zinc-950 font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white shadow-2xl transition-all"><Plus size={18}/> ADICIONAR INSUMO</button></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"><table className="w-full text-left font-bold text-sm"><thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800"><tr><th className="p-6">Insumo</th><th className="p-6">Estoque Atual</th><th className="p-6">Custo Exato</th><th className="p-6 text-center uppercase">Ações</th></tr></thead><tbody>{insumosBase.map(i => (<tr key={i.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors"><td className="p-6 font-black uppercase">{i.nome}</td><td className="p-6"><Badge variant="outline" className={i.estoque < 1000 && i.unidade !== 'UN' ? "border-red-500 text-red-400 bg-red-500/5" : "border-zinc-700 text-zinc-400"}>{i.estoque} {i.unidade}</Badge></td><td className="p-6 text-zinc-400">R$ {i.custo_unidade.toFixed(4)} / {i.unidade}</td><td className="p-6 text-center"><button onClick={() => abrirParaEdicaoInsumo(i)} className="p-2 text-zinc-500 hover:text-yellow-500 transition-all"><Edit size={18}/></button></td></tr>))}</tbody></table></div>
            </div>
          )}

          {/* SUB-ABA PERDAS E FILTRO PERSONALIZADO */}
          {visaoGestao === "perdas" && (
            <div className="animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Relatório de Desperdício</h2>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 items-center gap-1">
                          {["dia", "semana", "mes", "ano", "custom"].map(p => (
                              <button key={p} onClick={() => setPeriodoFiltro(p as any)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${periodoFiltro === p ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                  {p === 'custom' ? 'Período Específico' : p}
                              </button>
                          ))}
                      </div>

                      {periodoFiltro === 'custom' && (
                          <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-red-500/50 animate-in fade-in">
                              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-zinc-900 border-zinc-800 text-[10px] font-bold h-8 w-28 text-red-500" />
                              <span className="text-zinc-500 text-[10px] font-bold">até</span>
                              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-zinc-900 border-zinc-800 text-[10px] font-bold h-8 w-28 text-red-500" />
                          </div>
                      )}

                      <button onClick={() => { setPerdaEmEdicao(null); setNovaPerda({ insumo_id: "", quantidade: "" }); setModalNovaPerda(true); }} className="bg-red-600 text-zinc-50 font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-red-500 shadow-2xl transition-all shrink-0 text-xs"><AlertOctagon size={16}/> REGISTRAR PERDA</button>
                  </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <table className="w-full text-left font-bold text-sm">
                      <thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                          <tr><th className="p-6">Insumo Perdido</th><th className="p-6">Quantidade</th><th className="p-6 text-red-500">Custo do Prejuízo</th><th className="p-6">Data</th><th className="p-6 text-center uppercase">Ações</th></tr>
                      </thead>
                      <tbody>
                          {perdasFiltradas.length === 0 ? (
                              <tr><td colSpan={5} className="p-6 text-center text-zinc-500 italic uppercase font-black">Nenhuma perda no período selecionado</td></tr>
                          ) : (
                              perdasFiltradas.map(p => (
                                  <tr key={p.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                                      <td className="p-6 font-black uppercase text-zinc-200">{p.nome_insumo}</td>
                                      <td className="p-6 text-zinc-400">{p.quantidade}</td>
                                      <td className="p-6 text-red-500 font-black italic">R$ {p.custo_perda.toFixed(2)}</td>
                                      <td className="p-6 text-zinc-500 text-xs">{new Date(p.data_perda).toLocaleDateString()}</td>
                                      <td className="p-6 text-center"><button onClick={() => abrirParaEdicaoPerda(p)} className="p-2 text-zinc-500 hover:text-yellow-500 transition-all"><Edit size={18}/></button></td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
               </div>
             </div>
          )}

          {/* SUB-ABA EQUIPE */}
          {visaoGestao === "equipe" && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Controle de Acessos</h2><button onClick={() => { setNovoMembro({ nome: "", email: "", senha: "", role: "colaborador" }); setModalNovoUsuario(true); }} className="bg-blue-600 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-500 shadow-2xl transition-all"><UserPlus size={18}/> NOVO COLABORADOR</button></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"><table className="w-full text-left font-bold text-sm"><thead className="bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800"><tr><th className="p-6">Nome do Usuário</th><th className="p-6">Email (Login)</th><th className="p-6 text-blue-400">Nível de Acesso</th><th className="p-6 text-center">Ações</th></tr></thead><tbody>{usuariosEquipe.map(u => (<tr key={u.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors"><td className="p-6 font-black uppercase">{u.nome}</td><td className="p-6 text-zinc-400 text-xs">{u.email}</td><td className="p-6 text-blue-500 font-black uppercase text-[10px] tracking-widest">{u.role}</td><td className="p-6 text-center"><button onClick={() => removerUsuario(u.id)} disabled={u.role === 'gerente'} className={`p-2 transition-all ${u.role === 'gerente' ? 'text-zinc-700 cursor-not-allowed' : 'text-red-500 hover:text-red-400'}`}><Trash2 size={18}/></button></td></tr>))}</tbody></table></div>
            </div>
          )}
        </main>
      )}

      {/* SALÃO - COM BOTÃO NOVO ATENDIMENTO E KDS */}
      {visaoAtiva === "salao" && (
        <main className="p-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Salão</h2>
            <div className="flex items-center gap-4">
                {usuarioAtual?.role === 'gerente' && (
                    <button onClick={() => setModalPedidosAberto(true)} className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs transition-all shadow-xl ${pedidosPendentes.length > 0 ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-yellow-500'}`}>
                         <ChefHat size={16}/> PEDIDOS DE PREPARO {pedidosPendentes.length > 0 && `(${pedidosPendentes.length})`}
                    </button>
                )}
                <button onClick={abrirNovoAtendimento} className="bg-zinc-900 text-zinc-400 border border-zinc-800 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs hover:text-yellow-500 transition-all shadow-xl"><PlusCircle size={16}/> NOVO ATENDIMENTO</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {mesasReais.map((m) => (
              <div key={m.id} onClick={() => interagirComMesa(m)} className={`p-6 rounded-[2rem] border h-44 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.03] active:scale-95 shadow-lg ${m.status === 'livre' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-yellow-500/10 border-yellow-500/50 shadow-yellow-500/5'}`}>
                <div className="flex justify-between items-start">
                    <span className={`text-4xl font-black italic tracking-tighter ${m.status === 'livre' ? 'text-zinc-700' : 'text-yellow-500'}`}>
                        {m.numero.toString().padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2">
                        {m.status === 'ocupada' && <Badge className="bg-yellow-500 text-zinc-950 font-black text-[10px] uppercase max-w-[80px] truncate">{m.cliente}</Badge>}
                        {usuarioAtual?.role === 'gerente' && (
                            <button onClick={(e) => cancelarMesa(m, e)} className="text-zinc-600 hover:text-red-500 transition-colors p-1" title="Cancelar Mesa e Estornar Estoque">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <p className={`text-sm font-black tracking-widest uppercase ${m.status === 'livre' ? 'text-zinc-600' : 'text-yellow-500'}`}>{m.status === 'livre' ? 'Livre' : `R$ ${Number(m.total).toFixed(2).replace('.', ',')}`}</p>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* COZINHA / KDS */}
      <Sheet open={modalPedidosAberto} onOpenChange={setModalPedidosAberto}>
        <SheetContent className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 p-0 flex flex-col text-zinc-50 shadow-2xl">
             <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
            <SheetTitle className="text-3xl font-black text-yellow-500 italic uppercase">Cozinha / Preparo</SheetTitle>
            <p className="text-xs text-zinc-400 mt-2">Gerencie os pedidos que precisam ser preparados e entregues.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {pedidosPendentes.length === 0 ? (
               <p className="text-zinc-600 italic text-center py-6 font-black uppercase">Nenhum pedido pendente</p>
            ) : (
               pedidosPendentes.map(pedido => (
                  <div key={pedido.id} className="bg-zinc-900 border border-red-500/30 rounded-[1.5rem] overflow-hidden shadow-lg shadow-red-500/5">
                  <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex justify-between items-center">
                          <div>
                              <Badge className="bg-red-500 text-white font-black uppercase mb-1">MESA {pedido.mesa}</Badge>
                               <p className="text-xs font-bold text-zinc-300 uppercase">{pedido.cliente}</p>
                          </div>
                          <span className="text-xs font-black text-red-400"><Clock size={12} className="inline mr-1"/>{pedido.hora}</span>
                      </div>
                      <div className="p-4 space-y-3">
                          {pedido.itens.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                <div className="flex items-center gap-3">
                                      <span className="text-xl font-black text-yellow-500 italic">x{item.quantidade}</span>
                                      <span className="font-bold text-sm uppercase text-zinc-200">{item.nome}</span>
                               </div>
                              </div>
                          ))}
                       </div>
                      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
                          <button onClick={() => setPedidosPendentes((prev: any[]) => prev.filter(p => p.id !== pedido.id))} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl text-sm uppercase italic transition-all flex justify-center items-center gap-2">
                                <CheckCircle size={18} /> Finalizar e Entregar
                          </button>
                      </div>
                  </div>
               ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* CARDÁPIO MENU LATERAL */}
      <Sheet open={menuLateralAberto} onOpenChange={setMenuLateralAberto}>
        <SheetContent className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 p-0 flex flex-col text-zinc-50 shadow-2xl">
          <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
             <SheetTitle className="text-3xl font-black text-yellow-500 italic uppercase">Cardápio</SheetTitle>
             
             {/* INDICADOR DE LANÇAMENTO DIRECIONADO NA MESMA MESA */}
             {mesaSelecionada && getPessoasDaMesa(mesaSelecionada).length > 1 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded-xl mt-3 text-center animate-in fade-in">
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 block">
                    Adicionando pedidos na conta de:
                  </span>
                  <span className="font-black text-white text-xs uppercase">
                    {pessoaAtivaMesa === "Todos" ? getPessoasDaMesa(mesaSelecionada)[0] : pessoaAtivaMesa}
                  </span>
                </div>
             )}

            <div className="relative mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <Input placeholder="BUSCAR PRODUTO..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} className="bg-zinc-900 border-zinc-800 pl-12 h-14 rounded-2xl font-black uppercase italic tracking-tighter focus:ring-yellow-500" />
            </div>
            <div className="flex gap-2 overflow-x-auto mt-6 pb-2 scrollbar-hide">
              {categorias.map(cat => (
                <button key={cat} onClick={() => setCategoriaAtiva(cat)} className={`px-5 py-2 rounded-xl text-[10px] font-black border transition-all uppercase whitespace-nowrap ${categoriaAtiva === cat ? 'bg-yellow-500 text-zinc-950 border-yellow-500 shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {itensExibidosCardapio.map((item) => {
              const qtd = pedidoAtual.find(i => i.id === item.id)?.quantidade || 0;
              return (
                <div key={item.id} className={`p-5 rounded-[1.5rem] border transition-all flex justify-between items-center ${qtd > 0 ? 'border-yellow-500/40 bg-yellow-500/5 shadow-inner' : 'border-zinc-800 bg-zinc-900/30'}`}>
                  <div><p className="font-black uppercase tracking-tighter text-zinc-100">{item.nome}</p><p className="text-yellow-500 font-black text-lg italic tracking-tighter leading-tight">R$ {item.preco.toFixed(2)}</p></div>
                  <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-2xl border border-zinc-800 shadow-xl">
                     <button onClick={() => removerItem(item.id)} className="h-8 w-8 rounded-xl bg-zinc-900 text-red-500 flex items-center justify-center hover:bg-red-500/10"><Minus size={18}/></button>
                    <span className="font-black text-xl italic w-6 text-center">{qtd}</span>
                    <button onClick={() => adicionarItem(item)} className="h-8 w-8 rounded-xl bg-yellow-500 text-zinc-950 flex items-center justify-center"><Plus size={18}/></button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="p-8 border-t border-zinc-800 bg-zinc-900 shrink-0"><button onClick={() => setModalConfirmacaoAberto(true)} disabled={pedidoAtual.length === 0} className="w-full bg-yellow-500 text-zinc-950 font-black py-5 rounded-[1.5rem] flex justify-between px-8 italic tracking-tighter text-lg shadow-2xl transition-all active:scale-95"><span>CONFERIR ENVIO</span><span>R$ {pedidoAtual.reduce((acc, i) => acc + (i.preco * i.quantidade), 0).toFixed(2)}</span></button></div>
        </SheetContent>
      </Sheet>

      {/* CHECKOUT COM RESUMO PARCIAL OU TOTAL DA COMANDA */}
      <Dialog open={modalCheckoutAberto} onOpenChange={setModalCheckoutAberto}>
        <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-10 shadow-2xl">
          <DialogTitle className="text-3xl font-black uppercase text-center italic tracking-tighter">Recebimento</DialogTitle>
          <div className="mt-6 space-y-6">
             
             {/* SELETOR REFINADO DE MODO DE PAGAMENTO (TODA A MESA OU PESSOA ESPECÍFICA) */}
             {mesaSelecionada && getPessoasDaMesa(mesaSelecionada).length > 1 && (
                <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 animate-in fade-in">
                  <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest block mb-2 text-center">
                    Quem está pagando agora?
                  </Label>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <button
                      onClick={() => setModoFechamentoCheckout("Todos")}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${modoFechamentoCheckout === "Todos" ? 'bg-yellow-500 text-zinc-950 shadow-lg' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Juntar Toda a Comanda
                    </button>
                    {getPessoasDaMesa(mesaSelecionada).map(nome => (
                      <button
                        key={nome}
                        onClick={() => setModoFechamentoCheckout(nome)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${modoFechamentoCheckout === nome ? 'bg-yellow-500 text-zinc-950 shadow-lg' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Pagar Apenas {nome}
                      </button>
                    ))}
                  </div>
                </div>
             )}

             <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/50 max-h-[180px] overflow-y-auto scrollbar-hide space-y-2">
               <Label className="text-zinc-500 font-black uppercase text-[10px] mb-2 block tracking-widest">
                  Resumo do Pedido ({modoFechamentoCheckout})
               </Label>
               {itensCheckoutExibidos.length > 0 ? (
                   itensCheckoutExibidos.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-bold text-zinc-300 uppercase">
                         <span>{item.quantidade}x {item.nome}</span>
                         <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                      </div>
                   ))
               ) : (
                   <p className="text-[10px] text-zinc-600 italic">Sem itens para a seleção atual.</p>
                )}
               <div className="border-t border-zinc-800 mt-2 pt-2 flex justify-between font-black text-yellow-500 text-lg italic">
                  <span>TOTAL A PAGAR</span>
                  <span>R$ {totalCheckoutCalculado.toFixed(2)}</span>
               </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-center"><Label className="text-zinc-500 font-black uppercase text-[10px] mb-4 block">Dividir conta</Label><div className="flex items-center justify-center gap-8 mt-2"><button onClick={() => handleSplitChange(pessoasSplit - 1)} className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400"><Minus size={24}/></button><span className="text-4xl font-black italic text-white">{pessoasSplit}</span><button onClick={() => handleSplitChange(pessoasSplit + 1)} className="h-12 w-12 bg-yellow-500 text-zinc-950 rounded-full flex items-center justify-center"><Plus size={24}/></button></div></div>
            <div className="max-h-[200px] overflow-y-auto space-y-3 scrollbar-hide">
              {pagamentosSplit.map((pag) => (
                 <div key={pag.id} className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                 <div><p className="text-[10px] font-black text-zinc-500 uppercase">Pessoa {pag.id}</p><p className="text-lg font-black text-yellow-500 italic leading-none">R$ {pag.valor.toFixed(2)}</p></div>
                  <div className="flex gap-1 flex-wrap">
                    {["PIX", "DÉBITO", "CRÉDITO", "DINHEIRO"].map(m => (<button key={m} onClick={() => alterarMetodoPagamento(pag.id, m)} className={`px-2 py-1 rounded-md text-[8px] font-black border transition-all ${pag.metodo === m ? 'bg-yellow-500 text-zinc-950 border-yellow-500' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>{m}</button>))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <button onClick={finalizarComoFiado} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-6 rounded-[1.5rem] text-xl shadow-[0_10px_40px_rgba(234,88,12,0.3)] uppercase italic tracking-tighter active:scale-95 transition-all">Lançar Fiado</button>
               <button onClick={finalizarPagamentoMesa} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-6 rounded-[1.5rem] text-xl shadow-[0_10px_40px_rgba(22,163,74,0.3)] uppercase italic tracking-tighter active:scale-95 transition-all">Encerrar Pago</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHADO DE COMANDA FECHADA */}
      <Dialog open={!!vendaDetalhe} onOpenChange={() => setVendaDetalhe(null)}>
          <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-8 shadow-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase text-yellow-500 italic flex justify-between items-center">
                      <span>Comanda Fechada</span>
                      <Badge className="bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold text-[10px]">
                          {vendaDetalhe?.data_venda ? new Date(vendaDetalhe.data_venda).toLocaleDateString('pt-BR') : ''}
                      </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400 font-bold uppercase mt-1">
                      Cliente: {vendaDetalhe?.cliente_nome} {vendaDetalhe?.mesa_numero ? `(Mesa ${vendaDetalhe.mesa_numero})` : ''}
                  </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-4">
                  <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest block">Itens Consumidos</Label>
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 max-h-[220px] overflow-y-auto space-y-2 scrollbar-hide">
                      {vendaDetalhe?.itens && Array.isArray(vendaDetalhe.itens) && vendaDetalhe.itens.length > 0 ? (
                          vendaDetalhe.itens.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/60 font-bold text-xs">
                                  <div className="flex items-center gap-2">
                                      <span className="text-yellow-500 font-black italic">x{item.quantidade || 1}</span>
                                      <span className="uppercase text-zinc-200">{item.nome}</span>
                                  </div>
                                  <span className="text-zinc-400">R$ {((item.preco || 0) * (item.quantidade || 1)).toFixed(2)}</span>
                              </div>
                          ))
                      ) : (
                          <p className="text-zinc-600 italic text-xs font-bold text-center py-4">Nenhum detalhe de item guardado nesta venda antiga.</p>
                      )}
                  </div>

                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-zinc-400">
                          <span>Custo de Insumos:</span>
                          <span>R$ {Number(vendaDetalhe?.custo_total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-green-500">
                          <span>Lucro Líquido:</span>
                          <span>R$ {Number(vendaDetalhe?.lucro_total || 0).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-zinc-800 pt-1.5 flex justify-between text-sm font-black text-yellow-500 italic">
                          <span>VALOR PAGO:</span>
                          <span>R$ {Number(vendaDetalhe?.total_venda || 0).toFixed(2)}</span>
                      </div>
                  </div>
              </div>

              <button onClick={() => setVendaDetalhe(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all">
                  Fechar Ficha
              </button>
          </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE IDENTIFICAÇÃO DE MESA ABERTA */}
      <Dialog open={modalEditarMesa} onOpenChange={setModalEditarMesa}>
          <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-8 shadow-2xl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase text-yellow-500 italic text-center">Editar Identificação</DialogTitle>
                  <DialogDescription className="text-center text-xs text-zinc-400 font-bold">
                      Altere a mesa ou vincule a outra já aberta para unir comandas.
                  </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-4 text-left">
                  <div className="space-y-2">
                      <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Número da Mesa (Deixe 0 para Avulso)</Label>
                      <Input value={editMesaNum} onChange={e => setEditMesaNum(e.target.value)} placeholder="Ex: 5" className="bg-zinc-900 border-zinc-800 font-black text-center text-yellow-500 text-lg h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Nome do Cliente</Label>
                      <Input value={editMesaCliente} onChange={e => setEditMesaCliente(e.target.value)} placeholder="NOME" className="bg-zinc-900 border-zinc-800 font-black text-center text-zinc-200 h-12 rounded-xl uppercase" />
                  </div>
              </div>

              <button onClick={salvarEdicaoMesa} className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-black py-4 rounded-xl text-sm uppercase italic tracking-tighter shadow-xl transition-all">
                  Confirmar Alteração
              </button>
          </DialogContent>
      </Dialog>

      {/* GERENCIAR FIADO (MODAL NOVO) */}
      <Dialog open={modalGerenciarFiado} onOpenChange={setModalGerenciarFiado}>
          <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-10 shadow-2xl">
              <DialogTitle className="text-3xl font-black uppercase text-center italic tracking-tighter text-orange-500">Receber Fiado</DialogTitle>
              <div className="text-center mt-2">
                  <Badge className="bg-orange-500 text-zinc-950 font-black uppercase italic tracking-widest">{fiadoEmEdicao?.cliente_nome}</Badge>
              </div>

              <div className="mt-8 space-y-6">
                  <div className="flex justify-between items-center mb-2">
                      <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Itens Pendentes</Label>
                      <button onClick={selecionarTodosFiado} className="text-[10px] text-orange-500 font-black uppercase hover:text-orange-400">
                          {itensSelecionadosFiado.length === fiadoEmEdicao?.itens.length ? "Desmarcar Tudo" : "Marcar Tudo"}
                      </button>
                  </div>
                  
                  <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-2 max-h-[250px] overflow-y-auto space-y-2 scrollbar-hide">
                      {fiadoEmEdicao?.itens?.map((item: any, idx: number) => {
                          const isSelected = itensSelecionadosFiado.includes(idx);
                          return (
                              <div key={idx} onClick={() => alternarItemFiado(idx)} className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-orange-500/10 border-orange-500/50' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                                  <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 border ${isSelected ? 'bg-orange-500 border-orange-500 text-zinc-950' : 'bg-zinc-900 border-zinc-700'}`}>
                                      {isSelected && <CheckSquare size={14} />}
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-xs font-bold text-zinc-200 uppercase">{item.quantidade}x {item.nome}</p>
                                  </div>
                                  <span className="text-orange-500 font-black italic">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                              </div>
                          );
                      })}
                  </div>

                  <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-center">
                      <Label className="text-zinc-500 font-black uppercase text-[10px] mb-2 block tracking-widest">Valor Selecionado Para Receber</Label>
                      <p className="text-4xl font-black italic text-white">
                          R$ {fiadoEmEdicao?.itens.filter((_: any, i: number) => itensSelecionadosFiado.includes(i)).reduce((acc: number, item: any) => acc + (item.preco * item.quantidade), 0).toFixed(2) || "0.00"}
                      </p>
                  </div>

                  <button onClick={receberPagamentoFiado} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-6 rounded-[1.5rem] text-xl shadow-[0_10px_40px_rgba(22,163,74,0.3)] uppercase italic tracking-tighter active:scale-95 transition-all">
                      Confirmar Pagamento
                  </button>
              </div>
          </DialogContent>
      </Dialog>

      {/* CADASTRO DE NOVO USUÁRIO DA EQUIPE */}
      <Dialog open={modalNovoUsuario} onOpenChange={setModalNovoUsuario}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-10 shadow-2xl">
            <DialogTitle className="text-3xl font-black text-blue-500 uppercase italic tracking-tighter">Novo Colaborador</DialogTitle>
            <div className="space-y-6 mt-8">
                 <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Nome Completo</Label><Input value={novoMembro.nome} onChange={e => setNovoMembro({...novoMembro, nome: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl font-bold" /></div>
                <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Email de Acesso (Login)</Label><Input type="email" value={novoMembro.email} onChange={e => setNovoMembro({...novoMembro, email: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl font-bold" /></div>
                <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Senha do Colaborador</Label><Input type="password" value={novoMembro.senha} onChange={e => setNovoMembro({...novoMembro, senha: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl font-bold" /></div>
                <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Nível de Acesso</Label>
                    <select value={novoMembro.role} onChange={e => setNovoMembro({...novoMembro, role: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 h-14 rounded-xl px-4 text-zinc-200 font-bold outline-none">
                        <option value="colaborador">Colaborador / Garçom (Apenas Salão)</option>
                         <option value="gerente">Gerente (Acesso Total)</option>
                    </select>
                </div>
            </div>
            <button onClick={salvarNovoUsuario} className="w-full mt-10 bg-blue-600 text-white font-black py-5 rounded-[1.5rem] text-xl italic shadow-xl hover:bg-blue-500 transition-all">Liberar Acesso</button>
        </DialogContent>
       </Dialog>

      {/* CADASTRO DE PRODUTO DO CARDÁPIO */}
      <Dialog open={modalNovoProduto} onOpenChange={setModalNovoProduto}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-10 shadow-2xl max-w-2xl">
          <DialogTitle className="text-3xl font-black text-yellow-500 uppercase italic tracking-tighter">{produtoEmEdicao ? "Editar" : "Novo"} Produto no Cardápio</DialogTitle>
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="col-span-2 md:col-span-1 space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Nome Comercial</Label><Input value={novoProd.nome} onChange={e => setNovoProd({...novoProd, nome: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl font-bold" /></div>
            <div className="col-span-2 md:col-span-1 space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Categoria</Label><select value={novoProd.categoria} onChange={e => setNovoProd({...novoProd, categoria: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 h-14 rounded-xl px-4 text-zinc-200 font-bold focus:ring-yellow-500 outline-none">{categorias.filter(c => c !== "Todas").map(c => <option key={c} value={c}>{c}</option>)}</select></div>
             <div className="col-span-2 space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Preço de Venda (R$)</Label><Input value={novoProd.preco} onChange={e => setNovoProd({...novoProd, preco: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl text-yellow-500 font-black" /></div>
            
            <div className="col-span-2 space-y-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-yellow-500 font-black uppercase text-[12px] tracking-widest">
                        {novoProd.categoria === 'Drinks' || novoProd.categoria === 'Porções' ? 'Composição / Receita do Produto' : 'Ficha Técnica (Abate do Estoque)'}
                    </Label>
                </div>
                
                {(novoProd.categoria === 'Drinks' || novoProd.categoria === 'Porções') && (
                     <p className="text-[10px] text-zinc-400 italic">Dica: Selecione o insumo e a quantidade, depois clique no <strong className="text-yellow-500">+</strong>. Você pode adicionar vários itens sucessivamente para compor sua receita (Ex: 300g de Batata + 300g de Calabresa).</p>
                )}

                <div className="flex gap-2 items-center mt-2">
                    <select value={ingredienteTemp.insumo_id} onChange={e => setIngredienteTemp({...ingredienteTemp, insumo_id: e.target.value})} className="flex-1 bg-zinc-900 border border-zinc-800 h-12 rounded-xl px-4 text-zinc-200 text-xs font-bold outline-none truncate min-w-[120px]">
                        <option value="">Selecione o Insumo no Estoque...</option>
                        {insumosBase.map(i => <option key={i.id} value={i.id}>{i.nome} (Estoque em {i.unidade})</option>)}
                     </select>
                  
                    <div className="relative w-24 shrink-0">
                        <Input placeholder="Qtd" value={ingredienteTemp.qtd} onChange={e => setIngredienteTemp({...ingredienteTemp, qtd: e.target.value})} className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-center font-bold text-xs w-full pr-6" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-500 uppercase pointer-events-none">
                            {insumosBase.find(i => i.id === ingredienteTemp.insumo_id)?.unidade || ''}
                        </span>
                    </div>
                    
                    <button onClick={adicionarIngrediente} className="h-12 w-12 shrink-0 bg-yellow-500 text-zinc-950 rounded-xl flex items-center justify-center hover:bg-yellow-400 transition-all"><Plus size={18}/></button>
               </div>
                
                <div className="space-y-2 mt-4 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide">
                    {receitaTemp.length === 0 ? <p className="text-xs text-zinc-600 italic">Nenhum ingrediente vinculado.</p> : receitaTemp.map((ing, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                            <span className="text-xs font-bold uppercase text-zinc-300">{ing.nome}</span>
                              <div className="flex items-center gap-4">
                                <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50">{ing.qtd} {ing.unidade}</Badge>
                                <span className="text-[10px] text-zinc-500">Custo: R$ {ing.custo_calculado?.toFixed(2)}</span>
                                  <button onClick={() => setReceitaTemp(receitaTemp.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-400"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                  </div>
            </div>
          </div>
          <button onClick={salvarProduto} className="w-full mt-10 bg-yellow-600 text-zinc-950 font-black py-5 rounded-[1.5rem] text-xl italic shadow-xl hover:bg-yellow-500 transition-all">Salvar no Cardápio</button>
        </DialogContent>
      </Dialog>

      <Dialog open={modalNovoInsumo} onOpenChange={setModalNovoInsumo}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-10 shadow-2xl">
              <DialogTitle className="text-3xl font-black text-yellow-500 uppercase italic tracking-tighter">{insumoEmEdicao ? "Editar Insumo" : "Novo Insumo no Estoque"}</DialogTitle>
            <div className="space-y-6 mt-8">
                <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Nome do Insumo (Ex: Vodka Smirnoff)</Label><Input value={novoInsumo.nome} onChange={e => setNovoInsumo({...novoInsumo, nome: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl font-bold" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Formato de Compra</Label>
                        <select value={novoInsumo.formato} onChange={e => setNovoInsumo({...novoInsumo, formato: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 h-14 rounded-xl px-4 text-zinc-200 font-bold outline-none">
                            <option value="unidade">Por Unidade (Ex: Cerveja, Limão)</option>
                              <option value="garrafa_ml">Garrafa (Converte em ML)</option>
                            <option value="pacote_g">Pacote (Converte em Gramas)</option>
                            <option value="kg">Por Quilo (KG)</option>
                          <option value="litro">Por Litro (L)</option>
                        </select>
                    </div>
                    <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Custo deste Formato (R$)</Label><Input placeholder="Preço do pacote/garrafa" value={novoInsumo.custo_formato} onChange={e => setNovoInsumo({...novoInsumo, custo_formato: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl text-yellow-500 font-black" /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Quantidade Comprada</Label><Input placeholder="Ex: 5 garrafas, 10 pacotes" value={novoInsumo.qtd_comprada} onChange={e => setNovoInsumo({...novoInsumo, qtd_comprada: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl font-bold" /></div>
             
                     {(novoInsumo.formato === 'garrafa_ml' || novoInsumo.formato === 'pacote_g') && (
                        <div className="space-y-2 animate-in fade-in">
                            <Label className="text-yellow-500 font-black uppercase text-[10px]">{novoInsumo.formato === 'garrafa_ml' ? 'ML por Garrafa (Ex: 750)' : 'Gramas por Pacote (Ex: 500)'}</Label>
                            <Input placeholder={novoInsumo.formato === 'garrafa_ml' ? "750" : "500"} value={novoInsumo.rendimento} onChange={e => setNovoInsumo({...novoInsumo, rendimento: e.target.value})} className="bg-yellow-500/10 border-yellow-500/50 h-14 rounded-xl font-bold text-yellow-500" />
                        </div>
                    )}
                </div>
            </div>
             <button onClick={salvarInsumo} className="w-full mt-10 bg-yellow-600 text-zinc-950 font-black py-5 rounded-[1.5rem] text-xl italic shadow-xl hover:bg-yellow-500 transition-all">{insumoEmEdicao ? "Salvar Alterações" : "Registrar no Estoque"}</button>
        </DialogContent>
      </Dialog>

      <Dialog open={modalNovaPerda} onOpenChange={setModalNovaPerda}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-10 shadow-2xl">
            <DialogTitle className="text-3xl font-black text-red-500 uppercase italic tracking-tighter">{perdaEmEdicao ? "Editar Perda" : "Registrar Perda / Quebra"}</DialogTitle>
            <div className="space-y-6 mt-8">
                <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Insumo Perdido</Label><select value={novaPerda.insumo_id} onChange={e => setNovaPerda({...novaPerda, insumo_id: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 h-14 rounded-xl px-4 text-zinc-200 font-bold outline-none"><option value="">Selecione o Insumo...</option>{insumosBase.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}</select></div>
                <div className="space-y-2"><Label className="text-zinc-500 font-black uppercase text-[10px]">Quantidade Perdida ({insumosBase.find(i => i.id === novaPerda.insumo_id)?.unidade || 'UN / G / ML'})</Label><Input value={novaPerda.quantidade} onChange={e => setNovaPerda({...novaPerda, quantidade: e.target.value})} className="bg-zinc-950 border-zinc-800 h-14 rounded-xl font-bold" /></div>
            </div>
            <button onClick={registrarPerda} className="w-full mt-10 bg-red-600 text-zinc-50 font-black py-5 rounded-[1.5rem] text-xl italic shadow-xl hover:bg-red-500 transition-all">{perdaEmEdicao ? "Salvar Alterações" : "Confirmar Prejuízo"}</button>
        </DialogContent>
      </Dialog>

      <Dialog open={modalNovaComanda} onOpenChange={setModalNovaComanda}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 rounded-[2.5rem] p-10 shadow-2xl text-center">
            <DialogTitle className="text-3xl font-black text-yellow-500 uppercase italic">Abertura de Comanda</DialogTitle>
            <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 mt-8 mb-8">
                <button onClick={() => setTipoAtendimento("mesa")} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs transition-all ${tipoAtendimento === "mesa" ? "bg-yellow-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}>MESA</button>
                <button onClick={() => setTipoAtendimento("avulso")} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs transition-all ${tipoAtendimento === "avulso" ? "bg-yellow-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}>AVULSO</button>
            </div>
            <div className="space-y-6 text-left">
                {tipoAtendimento === "mesa" && (
                    <div className="space-y-2">
                        <Label className="text-zinc-500 font-black uppercase text-[10px] ml-2 tracking-widest">Número da Mesa</Label>
                        <Input value={inputMesaNova} onChange={e => setInputMesaNova(e.target.value)} placeholder="00" className="bg-zinc-900 border-zinc-800 h-14 rounded-xl text-center font-black" />
                    </div>
                )}
                <div className="space-y-2">
                     <Label className="text-zinc-500 font-black uppercase text-[10px] ml-2 tracking-widest">Cliente</Label>
                    <Input value={inputNomeCliente} onChange={e => setInputNomeCliente(e.target.value)} placeholder="NOME DO CLIENTE" className="bg-zinc-900 border-zinc-800 h-14 rounded-xl text-center font-black" />
                </div>
            </div>
            <button onClick={iniciarAtendimento} className="w-full mt-10 bg-yellow-500 text-zinc-950 font-black py-5 rounded-[1.5rem] text-xl italic uppercase active:scale-95 shadow-xl transition-all">Abrir Comanda</button>
        </DialogContent>
      </Dialog>

      {/* PREVIEW DA MESA ABERTA REFINADO COM GESTÃO DE MÚLTIPLAS PESSOAS */}
      <Sheet open={fichaMesaAberta} onOpenChange={setFichaMesaAberta}>
          <SheetContent className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 p-0 flex flex-col text-zinc-50 shadow-2xl">
              <div className="p-8 pb-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                  <div className="flex justify-between items-start">
                      <div>
                          <SheetTitle className="text-4xl font-black text-yellow-500 italic uppercase leading-none">Mesa {mesaSelecionada?.numero}</SheetTitle>
                          <p className="text-zinc-400 font-black uppercase text-xs mt-2 ml-1 opacity-70">Clientes: {mesaSelecionada?.cliente}</p>
                      </div>
                      
                      <button onClick={() => { setEditMesaNum(mesaSelecionada?.numero?.toString() || ""); setEditMesaCliente(mesaSelecionada?.cliente || ""); setModalEditarMesa(true); }} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-yellow-500 border border-zinc-800 p-2.5 rounded-xl transition-all shadow" title="Editar Nomes ou Fundir Mesas">
                          <Edit size={18} />
                      </button>
                  </div>

                  {/* ABAS REFINADAS POR PESSOA DA MESA */}
                  {mesaSelecionada && (
                      <div className="flex gap-2 overflow-x-auto mt-4 pt-1 scrollbar-hide border-b border-zinc-800/80">
                          {["Todos", ...getPessoasDaMesa(mesaSelecionada)].map((nome) => (
                              <button 
                                  key={nome} 
                                  onClick={() => setPessoaAtivaMesa(nome)}
                                  className={`px-4 py-2 rounded-t-lg font-black text-xs uppercase transition-all whitespace-nowrap ${pessoaAtivaMesa === nome ? 'bg-zinc-950 text-yellow-500 border-t-2 border-yellow-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                  {nome}
                              </button>
                          ))}
                          <button 
                              onClick={adicionarPessoaAMesaAberta}
                              className="px-3 py-2 text-xs font-bold text-yellow-500 hover:bg-yellow-500/10 rounded-t-lg flex items-center gap-1 shrink-0 ml-auto transition-colors"
                              title="Adicionar pessoa independente nesta mesa"
                          >
                              <Plus size={14} /> Pessoa
                          </button>
                      </div>
                  )}
              </div>
         
        {/* CONSUMO FILTRADO PELA PESSOA SELECIONADA */}
        <div className="flex-1 overflow-y-auto p-8 space-y-3 bg-zinc-950/50">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-zinc-500 font-black uppercase text-[10px] tracking-widest block">
              {pessoaAtivaMesa === "Todos" ? "Consumo Total da Mesa" : `Consumo de ${pessoaAtivaMesa}`}
            </Label>
            <span className="text-yellow-500 font-black text-sm italic">
              R$ {subtotalPessoaAtiva.toFixed(2)}
            </span>
          </div>

          {itensExibidosMesa.length > 0 ? (
            itensExibidosMesa.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-yellow-500 italic">x{item.quantidade}</span>
                  <span className="font-bold text-sm uppercase text-zinc-200">
                      {item.nome}
                      {pessoaAtivaMesa === "Todos" && getPessoasDaMesa(mesaSelecionada).length > 1 && (
                          <Badge className="ml-2 bg-zinc-800 text-zinc-400 text-[9px] border-none font-bold">
                              {item.dono || "Consumidor"}
                          </Badge>
                      )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-zinc-400 font-bold text-xs uppercase">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                    {usuarioAtual?.role === 'gerente' && (
                        <button onClick={() => estornarItemDaComanda(mesaSelecionada, idx, item)} className="text-zinc-600 hover:text-red-500 transition-colors" title="Estornar item da comanda">
                            <Trash2 size={16}/>
                        </button>
                    )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-zinc-600 italic text-sm font-bold">Nenhum pedido lançado para esta seleção.</p>
          )}

          {/* BOTÃO CIRÚRGICO DE DESMEMBRAMENTO PARA AVULSO (VISÍVEL QUANDO A ABA DE UMA PESSOA ESTÁ ATIVA) */}
          {pessoaAtivaMesa !== "Todos" && getPessoasDaMesa(mesaSelecionada).length > 1 && (
              <button 
                  onClick={() => separarPessoaParaAvulso(pessoaAtivaMesa)}
                  className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 border border-orange-500/30 hover:border-orange-500 text-orange-500 font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow"
              >
                  <span>⎋ Separar {pessoaAtivaMesa} para Comanda Independente</span>
              </button>
          )}

        </div>

        <div className="p-8 border-t border-zinc-800 bg-zinc-900 shrink-0 space-y-3">
          <button onClick={() => { setFichaMesaAberta(false); setTimeout(() => setMenuLateralAberto(true), 150); }} className="w-full bg-zinc-800 text-zinc-100 font-black py-5 rounded-[1.5rem] border border-zinc-700 uppercase tracking-widest text-xs transition-all hover:bg-zinc-700">Lançar Novo Item</button>
          <button onClick={abrirCheckout} className="w-full bg-red-600 text-zinc-50 font-black py-5 rounded-[1.5rem] uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Fechar Conta</button>
        </div>
      </SheetContent></Sheet>
      
      <Dialog open={modalConfirmacaoAberto} onOpenChange={setModalConfirmacaoAberto}><DialogContent className="sm:max-w-[450px] bg-zinc-950 border-zinc-800 text-zinc-50 p-0 rounded-[2.5rem] overflow-hidden shadow-2xl"><div className="p-8 border-b border-zinc-800 bg-zinc-900/50 text-center"><DialogTitle className="text-2xl font-black text-yellow-500 uppercase italic">Conferir Envio</DialogTitle><Badge className="mt-3 bg-yellow-500 text-zinc-950 font-black uppercase italic">MESA {inputMesaNova || mesaSelecionada?.numero}</Badge></div><div className="p-8 flex-1 overflow-y-auto max-h-[300px] bg-zinc-950/50 space-y-3">{pedidoAtual.map(item => (<div key={item.id} className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50"><div className="flex items-center gap-4"><span className="text-2xl font-black text-yellow-500 italic">x{item.quantidade}</span><span className="font-black uppercase tracking-tighter leading-none">{item.nome}</span></div><span className="text-zinc-500 font-bold text-xs uppercase">R$ {(item.preco * item.quantidade).toFixed(2)}</span></div>))}</div><div className="p-8 border-t border-zinc-800 bg-zinc-900/80"><div className="flex justify-between items-end mb-4"><span className="text-zinc-600 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Total Remessa</span><span className="text-4xl font-black text-yellow-500 italic leading-none">R$ {pedidoAtual.reduce((acc, i) => acc + (i.preco * i.quantidade), 0).toFixed(2)}</span></div><button onClick={() => confirmarEEnviarPedido()} className="w-full bg-yellow-500 text-zinc-950 font-black py-5 rounded-[1.5rem] uppercase italic tracking-tighter shadow-xl hover:bg-yellow-400 transition-all">Confirmar Envio</button></div></DialogContent></Dialog>
    </div>
  );
}