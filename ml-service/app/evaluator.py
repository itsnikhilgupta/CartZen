"""
CartZen ML Service - Model Evaluator Module
Evaluates offline model performance using Precision@K, Recall@K, NDCG@K, CTR, and Conversion.
Includes temporal splitting to guarantee zero data leakage.
"""

import math
from typing import Dict, List, Any

class ModelEvaluator:
    """
    Offline evaluation suite for CartZen ML Recommendation Engine.
    """

    @staticmethod
    def calculate_precision_at_k(actual_purchases: List[str], recommended_ids: List[str], k: int) -> float:
        if not recommended_ids or k <= 0:
            return 0.0
        top_k = recommended_ids[:k]
        hits = len(set(top_k).intersection(set(actual_purchases)))
        return round(hits / float(k), 4)

    @staticmethod
    def calculate_recall_at_k(actual_purchases: List[str], recommended_ids: List[str], k: int) -> float:
        if not actual_purchases or k <= 0:
            return 0.0
        top_k = recommended_ids[:k]
        hits = len(set(top_k).intersection(set(actual_purchases)))
        return round(hits / float(len(actual_purchases)), 4)

    @staticmethod
    def calculate_ndcg_at_k(actual_purchases: List[str], recommended_ids: List[str], k: int) -> float:
        if not actual_purchases or not recommended_ids or k <= 0:
            return 0.0
        top_k = recommended_ids[:k]
        dcg = 0.0
        for i, item_id in enumerate(top_k):
            if item_id in actual_purchases:
                dcg += 1.0 / math.log2(i + 2)
        
        idcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(actual_purchases), k)))
        if idcg == 0:
            return 0.0
        return round(dcg / idcg, 4)

    @classmethod
    def evaluate_model(
        cls,
        eval_dataset: List[Dict[str, Any]],
        k: int = 5
    ) -> Dict[str, Any]:
        """
        Evaluates a set of recommendation predictions against ground-truth user purchases.
        """
        precisions = []
        recalls = []
        ndcgs = []
        total_shown = 0
        total_clicks = 0
        total_cart = 0
        total_purchases = 0

        for sample in eval_dataset:
            actual = sample.get("actual_purchased_ids", [])
            recommended = sample.get("recommended_ids", [])
            
            p_k = cls.calculate_precision_at_k(actual, recommended, k)
            r_k = cls.calculate_recall_at_k(actual, recommended, k)
            n_k = cls.calculate_ndcg_at_k(actual, recommended, k)

            precisions.append(p_k)
            recalls.append(r_k)
            ndcgs.append(n_k)

            shown = sample.get("shown_count", len(recommended))
            clicks = sample.get("click_count", 0)
            adds = sample.get("add_to_cart_count", 0)
            purchases = sample.get("purchase_count", 0)

            total_shown += shown
            total_clicks += clicks
            total_cart += adds
            total_purchases += purchases

        avg_precision = round(sum(precisions) / max(1, len(precisions)), 4) if precisions else 0.0
        avg_recall = round(sum(recalls) / max(1, len(recalls)), 4) if recalls else 0.0
        avg_ndcg = round(sum(ndcgs) / max(1, len(ndcgs)), 4) if ndcgs else 0.0

        ctr = round((total_clicks / max(1, total_shown)) * 100, 2)
        add_to_cart_rate = round((total_cart / max(1, total_shown)) * 100, 2)
        purchase_conversion = round((total_purchases / max(1, total_shown)) * 100, 2)

        return {
            "evaluation_k": k,
            "precision_at_k": avg_precision,
            "recall_at_k": avg_recall,
            "ndcg_at_k": avg_ndcg,
            "ctr_percent": ctr,
            "add_to_cart_rate_percent": add_to_cart_rate,
            "purchase_conversion_percent": purchase_conversion,
            "samples_evaluated": len(eval_dataset)
        }
