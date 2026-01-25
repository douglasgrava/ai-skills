#!/usr/bin/env python3
"""
Script de Análise de Logs de Auditoria Cognitiva

Agrega múltiplos logs de metadata de auditoria para identificar padrões,
tendências e oportunidades de melhoria contínua.

Uso:
    python analisar-logs.py <diretório_com_logs>
    python analisar-logs.py <arquivo1.md> <arquivo2.md> ...
"""

import re
import sys
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime
from typing import List, Dict, Any


class MetadataParser:
    """Parser para extrair metadata estruturada de arquivos markdown."""
    
    @staticmethod
    def parse_file(filepath: Path) -> Dict[str, Any]:
        """Extrai metadata de um arquivo de log."""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        metadata = {
            'arquivo': filepath.name,
            'timestamp_inicio': None,
            'timestamp_fim': None,
            'duracao': None,
            'tipo_inquerito': None,
            'complexidade': None,
            'niveis_executados': [],
            'nota_rigor_n1': None,
            'nota_rigor_n2': None,
            'nota_rigor_final': None,
            'principais_correcoes': [],
            'vieses_identificados': [],
            'risco': None,
            'mudanca_significativa': None,
            'melhoria_rigor': None,
            'edge_cases': None,
            'heuristicas_problematicas': []
        }
        
        # Extrair timestamps
        ts_inicio = re.search(r'\*\*Timestamp Início:\*\*.*?(\d{4}-\d{2}-\d{2}T[\d:]+Z?)', content)
        if ts_inicio:
            metadata['timestamp_inicio'] = ts_inicio.group(1)
        
        ts_fim = re.search(r'\*\*Timestamp Fim:\*\*.*?(\d{4}-\d{2}-\d{2}T[\d:]+Z?)', content)
        if ts_fim:
            metadata['timestamp_fim'] = ts_fim.group(1)
        
        # Extrair duração
        duracao = re.search(r'\*\*Duração Total:\*\*.*?(\d+)', content)
        if duracao:
            metadata['duracao'] = int(duracao.group(1))
        
        # Extrair tipo de inquérito
        tipo = re.search(r'\*\*Tipo de Inquérito:\*\*.*?(Descriptive|Analytical|Strategic|Ontological)', content)
        if tipo:
            metadata['tipo_inquerito'] = tipo.group(1)
        
        # Extrair complexidade
        complexidade = re.search(r'\*\*Complexidade Estimada:\*\*.*?(Baixa|Média|Alta)', content)
        if complexidade:
            metadata['complexidade'] = complexidade.group(1)
        
        # Extrair níveis executados
        niveis = re.search(r'\*\*Níveis Executados:\*\*.*?\[([\d,\s]+)\]', content)
        if niveis:
            metadata['niveis_executados'] = [int(n.strip()) for n in niveis.group(1).split(',')]
        
        # Extrair notas de rigor
        nota_n1 = re.search(r'\*\*Nota de Rigor Nível 1:\*\*.*?(\d+)', content)
        if nota_n1:
            metadata['nota_rigor_n1'] = int(nota_n1.group(1))
        
        nota_n2 = re.search(r'\*\*Nota de Rigor Nível 2:\*\*.*?(\d+)', content)
        if nota_n2:
            metadata['nota_rigor_n2'] = int(nota_n2.group(1))
        
        nota_final = re.search(r'\*\*Nota de Rigor Final:\*\*.*?(\d+)', content)
        if nota_final:
            metadata['nota_rigor_final'] = int(nota_final.group(1))
        
        # Extrair risco
        risco = re.search(r'\*\*Risco Identificado:\*\*.*?(Baixo|Médio|Alto)', content)
        if risco:
            metadata['risco'] = risco.group(1)
        
        # Extrair mudança significativa
        mudanca = re.search(r'\*\*Mudança Significativa:\*\*.*?(Sim|Não)', content)
        if mudanca:
            metadata['mudanca_significativa'] = mudanca.group(1) == 'Sim'
        
        # Extrair melhoria de rigor
        melhoria = re.search(r'\*\*Melhoria de Rigor \(Δ\):\*\*.*?(\d+)', content)
        if melhoria:
            metadata['melhoria_rigor'] = int(melhoria.group(1))
        
        # Extrair edge cases
        edge_cases = re.search(r'\*\*Edge Cases Identificados:\*\*.*?(\d+)', content)
        if edge_cases:
            metadata['edge_cases'] = int(edge_cases.group(1))
        
        # Extrair listas (correções, vieses, heurísticas)
        metadata['principais_correcoes'] = MetadataParser._extract_list_items(
            content, r'\*\*Principais Correções:\*\*', r'\*\*Vieses Identificados:\*\*'
        )
        
        metadata['vieses_identificados'] = MetadataParser._extract_list_items(
            content, r'\*\*Vieses Identificados:\*\*', r'\*\*Risco Identificado:\*\*'
        )
        
        metadata['heuristicas_problematicas'] = MetadataParser._extract_list_items(
            content, r'\*\*Heurísticas Problemáticas:\*\*', r'$'
        )
        
        return metadata
    
    @staticmethod
    def _extract_list_items(content: str, start_pattern: str, end_pattern: str) -> List[str]:
        """Extrai itens de lista entre dois padrões."""
        match = re.search(f'{start_pattern}(.*?){end_pattern}', content, re.DOTALL)
        if not match:
            return []
        
        section = match.group(1)
        items = re.findall(r'-\s*\[?([^\]\n]+)\]?', section)
        return [item.strip() for item in items if item.strip() and not item.strip().startswith('[')]


class LogAnalyzer:
    """Analisador de logs agregados."""
    
    def __init__(self, logs: List[Dict[str, Any]]):
        self.logs = logs
    
    def gerar_relatorio(self) -> str:
        """Gera relatório consolidado de análise."""
        if not self.logs:
            return "Nenhum log encontrado para análise."
        
        relatorio = []
        relatorio.append("=" * 80)
        relatorio.append("RELATÓRIO DE ANÁLISE DE LOGS DE AUDITORIA COGNITIVA")
        relatorio.append("=" * 80)
        relatorio.append(f"\nTotal de execuções analisadas: {len(self.logs)}\n")
        
        # Estatísticas temporais
        relatorio.append(self._secao_temporal())
        
        # Distribuição de tipos e complexidade
        relatorio.append(self._secao_distribuicao())
        
        # Análise de rigor
        relatorio.append(self._secao_rigor())
        
        # Análise de riscos
        relatorio.append(self._secao_riscos())
        
        # Padrões identificados
        relatorio.append(self._secao_padroes())
        
        # Recomendações
        relatorio.append(self._secao_recomendacoes())
        
        return "\n".join(relatorio)
    
    def _secao_temporal(self) -> str:
        """Análise de métricas temporais."""
        duracoes = [log['duracao'] for log in self.logs if log['duracao']]
        
        if not duracoes:
            return "\n## Análise Temporal\nDados insuficientes.\n"
        
        media = sum(duracoes) / len(duracoes)
        minima = min(duracoes)
        maxima = max(duracoes)
        
        return f"""
## Análise Temporal
- Duração média: {media:.1f} segundos
- Duração mínima: {minima} segundos
- Duração máxima: {maxima} segundos
"""
    
    def _secao_distribuicao(self) -> str:
        """Distribuição de tipos e complexidades."""
        tipos = Counter(log['tipo_inquerito'] for log in self.logs if log['tipo_inquerito'])
        complexidades = Counter(log['complexidade'] for log in self.logs if log['complexidade'])
        
        secao = ["\n## Distribuição de Problemas"]
        
        if tipos:
            secao.append("\n### Tipos de Inquérito:")
            for tipo, count in tipos.most_common():
                pct = (count / len(self.logs)) * 100
                secao.append(f"- {tipo}: {count} ({pct:.1f}%)")
        
        if complexidades:
            secao.append("\n### Complexidade:")
            for comp, count in complexidades.most_common():
                pct = (count / len(self.logs)) * 100
                secao.append(f"- {comp}: {count} ({pct:.1f}%)")
        
        return "\n".join(secao)
    
    def _secao_rigor(self) -> str:
        """Análise de notas de rigor."""
        notas_n1 = [log['nota_rigor_n1'] for log in self.logs if log['nota_rigor_n1']]
        notas_n2 = [log['nota_rigor_n2'] for log in self.logs if log['nota_rigor_n2']]
        notas_final = [log['nota_rigor_final'] for log in self.logs if log['nota_rigor_final']]
        melhorias = [log['melhoria_rigor'] for log in self.logs if log['melhoria_rigor']]
        
        secao = ["\n## Análise de Rigor"]
        
        if notas_n1:
            secao.append(f"- Nota média Nível 1: {sum(notas_n1)/len(notas_n1):.1f}")
        if notas_n2:
            secao.append(f"- Nota média Nível 2: {sum(notas_n2)/len(notas_n2):.1f}")
        if notas_final:
            secao.append(f"- Nota média Final: {sum(notas_final)/len(notas_final):.1f}")
        if melhorias:
            secao.append(f"- Melhoria média de rigor (Δ): {sum(melhorias)/len(melhorias):.1f} pontos")
        
        return "\n".join(secao)
    
    def _secao_riscos(self) -> str:
        """Análise de riscos identificados."""
        riscos = Counter(log['risco'] for log in self.logs if log['risco'])
        mudancas = sum(1 for log in self.logs if log['mudanca_significativa'])
        
        secao = ["\n## Análise de Riscos"]
        
        if riscos:
            secao.append("\n### Distribuição de Riscos:")
            for risco, count in riscos.most_common():
                pct = (count / len(self.logs)) * 100
                secao.append(f"- {risco}: {count} ({pct:.1f}%)")
        
        if mudancas:
            pct_mudancas = (mudancas / len(self.logs)) * 100
            secao.append(f"\n### Mudanças Significativas: {mudancas} ({pct_mudancas:.1f}%)")
        
        return "\n".join(secao)
    
    def _secao_padroes(self) -> str:
        """Identificação de padrões recorrentes."""
        todos_vieses = []
        todas_heuristicas = []
        todos_edge_cases = []
        
        for log in self.logs:
            todos_vieses.extend(log['vieses_identificados'])
            todas_heuristicas.extend(log['heuristicas_problematicas'])
            if log['edge_cases']:
                todos_edge_cases.append(log['edge_cases'])
        
        vieses_freq = Counter(todos_vieses)
        heuristicas_freq = Counter(todas_heuristicas)
        
        secao = ["\n## Padrões Identificados"]
        
        if vieses_freq:
            secao.append("\n### Vieses Mais Comuns:")
            for vies, count in vieses_freq.most_common(5):
                secao.append(f"- {vies}: {count}x")
        
        if heuristicas_freq:
            secao.append("\n### Heurísticas Problemáticas Recorrentes:")
            for heur, count in heuristicas_freq.most_common(5):
                secao.append(f"- {heur}: {count}x")
        
        if todos_edge_cases:
            media_edge = sum(todos_edge_cases) / len(todos_edge_cases)
            secao.append(f"\n### Edge Cases: média de {media_edge:.1f} por execução")
        
        return "\n".join(secao)
    
    def _secao_recomendacoes(self) -> str:
        """Gera recomendações baseadas nos padrões."""
        secao = ["\n## Recomendações"]
        
        # Análise de melhoria de rigor
        melhorias = [log['melhoria_rigor'] for log in self.logs if log['melhoria_rigor']]
        if melhorias:
            media_melhoria = sum(melhorias) / len(melhorias)
            if media_melhoria < 2:
                secao.append("⚠️  Melhoria de rigor baixa - considere revisar critérios de auditoria")
            elif media_melhoria > 5:
                secao.append("✅ Processo de auditoria está gerando melhorias significativas")
        
        # Análise de riscos altos
        riscos_altos = sum(1 for log in self.logs if log['risco'] == 'Alto')
        if riscos_altos > len(self.logs) * 0.3:
            secao.append("⚠️  Alta incidência de riscos elevados - revisar processo de classificação inicial")
        
        # Análise de tipos de inquérito
        tipos = Counter(log['tipo_inquerito'] for log in self.logs if log['tipo_inquerito'])
        if tipos:
            tipo_dominante = tipos.most_common(1)[0]
            if tipo_dominante[1] > len(self.logs) * 0.7:
                secao.append(f"ℹ️  Predominância de inquéritos {tipo_dominante[0]} - considere diversificar casos de teste")
        
        return "\n".join(secao)


def main():
    """Função principal."""
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    # Coletar arquivos para análise
    arquivos = []
    for arg in sys.argv[1:]:
        path = Path(arg)
        if path.is_dir():
            arquivos.extend(path.glob('*.md'))
        elif path.is_file():
            arquivos.append(path)
    
    if not arquivos:
        print("Nenhum arquivo markdown encontrado.")
        sys.exit(1)
    
    print(f"Analisando {len(arquivos)} arquivo(s)...\n")
    
    # Parse dos logs
    logs = []
    for arquivo in arquivos:
        try:
            metadata = MetadataParser.parse_file(arquivo)
            logs.append(metadata)
        except Exception as e:
            print(f"Erro ao processar {arquivo}: {e}")
    
    # Gerar relatório
    analyzer = LogAnalyzer(logs)
    relatorio = analyzer.gerar_relatorio()
    print(relatorio)


if __name__ == '__main__':
    main()
