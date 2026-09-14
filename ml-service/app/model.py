"""
CartZen ML Service - Interpretable Content-Based & Cosine Similarity Model
Uses TF-IDF feature matrices, cosine similarity, and multi-factor behavioral scoring.
"""

import math
from typing import Dict, List, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.features import FeatureExtractor

class CartZenMLRecommender:
    """
    Interpretable Machine Learning Recommendation Model.
    Combines TF-IDF Content Vector Cosine Similarity with behavioral feature weighting.
    """

    MODEL_VERSION = "v2.0.0-ml-content-cosine"

    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.is_fitted = False

    def build_item_text(self, prod_features: Dict[str, Any]) -> str:
        tags_str = " ".join(prod_features.get("nutrition_tags", []))
        return f"{prod_features['name']} {prod_features['brand']} {prod_features['category']} {tags_str}".lower()

    def rank_candidates(
        self,
        user_events: List[Dict[str, Any]],
        current_cart_ids: List[str],
        candidate_products: List[Dict[str, Any]],
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Ranks candidate products for a customer session using TF-IDF + Cosine Similarity + Behavior.
        """
        if not candidate_products:
            return []

        user_feats = FeatureExtractor.extract_user_features(user_events)

        # Build candidate item feature representations
        cand_features = [FeatureExtractor.extract_product_features(p) for p in candidate_products]
        corpus = [self.build_item_text(f) for f in cand_features]

        # Construct cart / profile query representation
        cart_texts = []
        for p in candidate_products:
            if p.get("id") in current_cart_ids:
                cart_texts.append(self.build_item_text(FeatureExtractor.extract_product_features(p)))

        query_text = " ".join(cart_texts) if cart_texts else "supermarket groceries organic fresh food"

        # Fit TF-IDF matrix
        try:
            tfidf_matrix = self.vectorizer.fit_transform(corpus + [query_text])
            cand_vectors = tfidf_matrix[:-1]
            query_vector = tfidf_matrix[-1:]

            sim_scores = cosine_similarity(cand_vectors, query_vector).flatten()
        except Exception:
            sim_scores = [0.5] * len(cand_features)

        frequent_prods = user_feats.get("frequent_products", {})
        category_affinity = user_feats.get("category_affinity", {})

        scored_candidates = []
        for idx, f in enumerate(cand_features):
            p_orig = candidate_products[idx]
            cos_sim = float(sim_scores[idx]) if idx < len(sim_scores) else 0.0

            # Compute composite ranking score
            score = 0.4 + (cos_sim * 0.3)
            rec_type = "PERSONALIZED"
            reason = "Recommended product based on your shopping affinity"

            # Repeat purchase boost
            if f["id"] in frequent_prods:
                buy_count = frequent_prods[f["id"]]
                score += min(0.25, buy_count * 0.08)
                rec_type = "FREQUENTLY_BOUGHT"
                reason = "You frequently purchase this product"

            # Category affinity boost
            cat = f["category"]
            if cat in category_affinity:
                score += min(0.15, category_affinity[cat] * 0.03)

            # Nutrition classification reason
            tags = f.get("nutrition_tags", [])
            if "HIGH_PROTEIN" in tags:
                rec_type = "HIGH_PROTEIN"
                reason = "High protein option matching your preference"
            elif "LOW_SUGAR" in tags:
                rec_type = "LOW_SUGAR"
                reason = "Low sugar option based on your shopping choices"
            elif "HIGH_FIBRE" in tags:
                rec_type = "HIGH_FIBRE"
                reason = "High fibre selection matching your preference"
            elif "LOW_CALORIE" in tags:
                rec_type = "LOW_CALORIE"
                reason = "Lower calorie option based on your preference"

            final_score = min(0.99, max(0.1, round(score, 2)))

            scored_candidates.append({
                "product": p_orig,
                "score": final_score,
                "reason": reason,
                "recommendationType": rec_type,
                "algorithmVersion": self.MODEL_VERSION,
                "personalized": user_feats["total_events"] >= 2,
            })

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        return scored_candidates[:limit]
