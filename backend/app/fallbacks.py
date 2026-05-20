from __future__ import annotations

DEMO_TEST = {
    "questions": [
        {
            "id": "q1",
            "type": "objective",
            "prompt": "Qual elemento funciona como variavel de entrada na cena?",
            "options": ["Grandeza A", "Grandeza B", "Invariante B/A", "Linha do tempo"],
            "answer": "Grandeza A",
        },
        {
            "id": "q2",
            "type": "objective",
            "prompt": "O que deixa de valer quando a relacao B = k * A e removida?",
            "options": ["B precisa acompanhar A", "A pode ser alterada", "k existe no painel", "A cena possui objetos"],
            "answer": "B precisa acompanhar A",
        },
        {
            "id": "q3",
            "type": "explanation",
            "prompt": "Explique por que B/A permanece constante enquanto a conexao proporcional esta ativa.",
        },
    ]
}
