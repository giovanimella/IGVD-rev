from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import Assessment, AssessmentCreate, Question, QuestionCreate, UserAssessment, AssessmentSubmission
from auth import get_current_user, require_role
import os
from datetime import datetime, timezone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/assessments", tags=["assessments"])

@router.post("/")
async def create_assessment(assessment_data: AssessmentCreate, current_user: dict = Depends(require_role(["admin"]))):
    assessment = Assessment(**assessment_data.model_dump())
    await db.assessments.insert_one(assessment.model_dump())
    
    await db.modules.update_one(
        {"id": assessment_data.module_id},
        {"$set": {"has_assessment": True}}
    )
    
    return assessment

@router.get("/module/{module_id}")
async def get_module_assessment(module_id: str, current_user: dict = Depends(get_current_user)):
    assessment = await db.assessments.find_one({"module_id": module_id}, {"_id": 0})
    if not assessment:
        return None
    
    questions = await db.questions.find({"assessment_id": assessment["id"]}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    if current_user.get("role") != "admin":
        for question in questions:
            question.pop("correct_answer", None)
    
    assessment["questions"] = questions
    
    total_points = sum(q.get("points", 0) for q in questions)
    assessment["total_points"] = total_points
    
    return assessment

@router.get("/{assessment_id}")
async def get_assessment(assessment_id: str, current_user: dict = Depends(get_current_user)):
    assessment = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    
    questions = await db.questions.find({"assessment_id": assessment_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    if current_user.get("role") != "admin":
        for question in questions:
            question.pop("correct_answer", None)
    
    assessment["questions"] = questions
    
    total_points = sum(q.get("points", 0) for q in questions)
    assessment["total_points"] = total_points
    
    return assessment

@router.put("/{assessment_id}")
async def update_assessment(assessment_id: str, updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.assessments.update_one(
        {"id": assessment_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return {"message": "Avaliação atualizada com sucesso"}

@router.delete("/{assessment_id}")
async def delete_assessment(assessment_id: str, current_user: dict = Depends(require_role(["admin"]))):
    await db.questions.delete_many({"assessment_id": assessment_id})
    await db.user_assessments.delete_many({"assessment_id": assessment_id})
    
    assessment = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if assessment:
        await db.modules.update_one(
            {"id": assessment["module_id"]},
            {"$set": {"has_assessment": False}}
        )
    
    result = await db.assessments.delete_one({"id": assessment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return {"message": "Avaliação deletada com sucesso"}

@router.post("/questions")
async def create_question(question_data: QuestionCreate, current_user: dict = Depends(require_role(["admin"]))):
    question = Question(**question_data.model_dump())
    await db.questions.insert_one(question.model_dump())
    return question

@router.put("/questions/{question_id}")
async def update_question(question_id: str, updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.questions.update_one(
        {"id": question_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return {"message": "Questão atualizada com sucesso"}

@router.delete("/questions/{question_id}")
async def delete_question(question_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return {"message": "Questão deletada com sucesso"}

@router.post("/submit")
async def submit_assessment(submission: AssessmentSubmission, current_user: dict = Depends(get_current_user)):
    assessment = await db.assessments.find_one({"id": submission.assessment_id}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    
    questions = await db.questions.find({"assessment_id": submission.assessment_id}, {"_id": 0}).to_list(1000)
    
    score = 0
    graded_answers = []
    
    for answer in submission.answers:
        question = next((q for q in questions if q["id"] == answer["question_id"]), None)
        if not question:
            continue
        
        is_correct = False
        if question["question_type"] in ["multiple_choice", "checkbox"]:
            is_correct = answer.get("answer") == question.get("correct_answer")
        elif question["question_type"] == "numeric":
            try:
                user_answer = float(answer.get("answer", 0))
                correct_answer = float(question.get("correct_answer", 0))
                is_correct = abs(user_answer - correct_answer) < 0.01
            except:
                is_correct = False
        
        if is_correct:
            score += question["points"]
        
        graded_answers.append({
            "question_id": answer["question_id"],
            "question_text": question["question_text"],
            "answer": answer.get("answer"),
            "correct_answer": question.get("correct_answer"),
            "is_correct": is_correct,
            "points": question["points"] if is_correct else 0,
            "max_points": question["points"]
        })
    
    total_points = sum(q["points"] for q in questions)
    passed = score >= assessment["passing_score"]
    
    user_assessment = UserAssessment(
        user_id=current_user["sub"],
        assessment_id=submission.assessment_id,
        answers=graded_answers,
        score=score,
        passed=passed
    )
    
    await db.user_assessments.insert_one(user_assessment.model_dump())
    
    if passed:
        module = await db.modules.find_one({"id": assessment["module_id"]}, {"_id": 0})
        if module and module.get("points_reward", 0) > 0:
            await db.users.update_one(
                {"id": current_user["sub"]},
                {"$inc": {"points": module["points_reward"]}}
            )
    
    return {
        "score": score,
        "total_points": total_points,
        "passed": passed,
        "passing_score": assessment["passing_score"],
        "answers": graded_answers
    }

@router.get("/results/{assessment_id}")
async def get_assessment_results(assessment_id: str, current_user: dict = Depends(get_current_user)):
    results = await db.user_assessments.find({
        "user_id": current_user["sub"],
        "assessment_id": assessment_id
    }, {"_id": 0}).sort("completed_at", -1).to_list(10)
    
    return results

@router.get("/results/module/{module_id}")
async def get_module_assessment_result(module_id: str, current_user: dict = Depends(get_current_user)):
    assessment = await db.assessments.find_one({"module_id": module_id}, {"_id": 0})
    if not assessment:
        return None
    
    result = await db.user_assessments.find_one({
        "user_id": current_user["sub"],
        "assessment_id": assessment["id"],
        "passed": True
    }, {"_id": 0})
    
    return result