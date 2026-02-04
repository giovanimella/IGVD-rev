from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from motor.motor_asyncio import AsyncIOMotorClient
from models import TimelinePost, TimelinePostCreate, TimelineComment, TimelineCommentCreate, TimelineLike, TimelineReaction
from auth import get_current_user, require_role
import os
from datetime import datetime
from pathlib import Path
import uuid
import shutil

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/timeline", tags=["timeline"])

# Diretório para imagens da timeline
TIMELINE_UPLOAD_DIR = Path("/app/uploads/timeline")
TIMELINE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

# Função auxiliar para buscar dados completos do usuário
async def get_user_data(user_id: str):
    """Busca dados completos do usuário pelo ID"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "profile_picture": 1})
    return user

# ==================== POSTS ====================

@router.get("/posts")
async def get_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Lista posts da timeline (paginado)"""
    skip = (page - 1) * limit
    user_id = current_user["sub"]
    
    # Buscar posts ativos, ordenados por fixados primeiro, depois por data
    posts = await db.timeline_posts.find(
        {"is_active": True}
    ).sort([
        ("is_pinned", -1),
        ("created_at", -1)
    ]).skip(skip).limit(limit).to_list(limit)
    
    # Para cada post, verificar se o usuário atual curtiu e buscar dados do autor
    for post in posts:
        post["_id"] = str(post.get("_id", ""))
        
        # Buscar dados atualizados do autor
        author_data = await get_user_data(post.get("author_id"))
        if author_data:
            post["author_name"] = author_data.get("full_name", "Usuário")
            post["author_avatar"] = author_data.get("profile_picture")
        
        # Verificar se o usuário curtiu
        user_reaction = await db.timeline_reactions.find_one({
            "post_id": post["id"],
            "user_id": current_user["sub"]
        })
        post["user_reacted"] = user_reaction is not None
        post["user_reaction_type"] = user_reaction["reaction_type"] if user_reaction else None
        
        # Buscar reações agrupadas
        reactions = await db.timeline_reactions.aggregate([
            {"$match": {"post_id": post["id"]}},
            {"$group": {"_id": "$reaction_type", "count": {"$sum": 1}}}
        ]).to_list(100)
        post["reactions"] = {r["_id"]: r["count"] for r in reactions}
    
    total = await db.timeline_posts.count_documents({"is_active": True})
    
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.post("/posts")
async def create_post(
    post_data: TimelinePostCreate,
    current_user: dict = Depends(get_current_user)
):
    """Criar novo post na timeline"""
    if current_user["role"] not in ["licenciado", "admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    user_id = current_user["sub"]
    # Buscar dados completos do usuário do banco
    user_data = await get_user_data(user_id)
    
    post = TimelinePost(
        author_id=user_id,
        author_name=user_data.get("full_name", "Usuário") if user_data else "Usuário",
        author_avatar=user_data.get("profile_picture") if user_data else None,
        content=post_data.content,
        image_url=post_data.image_url
    )
    
    await db.timeline_posts.insert_one(post.model_dump())
    
    return {"message": "Post criado com sucesso", "post": post.model_dump()}


@router.post("/posts/upload-image")
async def upload_post_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de imagem para post"""
    # Validar extensão
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Formato de imagem não suportado")
    
    # Ler arquivo
    contents = await file.read()
    
    # Validar tamanho
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Imagem muito grande. Máximo: 5MB")
    
    # Gerar nome único
    filename = f"{uuid.uuid4()}{ext}"
    filepath = TIMELINE_UPLOAD_DIR / filename
    
    # Salvar arquivo
    with open(filepath, "wb") as f:
        f.write(contents)
    
    image_url = f"/api/uploads/timeline/{filename}"
    
    return {"image_url": image_url}


@router.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Buscar post específico"""
    post = await db.timeline_posts.find_one({"id": post_id, "is_active": True}, {"_id": 0})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    
    # Verificar se o usuário curtiu
    user_reaction = await db.timeline_reactions.find_one({
        "post_id": post_id,
        "user_id": current_user["sub"]
    })
    post["user_reacted"] = user_reaction is not None
    post["user_reaction_type"] = user_reaction["reaction_type"] if user_reaction else None
    
    # Buscar comentários
    comments = await db.timeline_comments.find(
        {"post_id": post_id, "is_active": True}
    ).sort("created_at", 1).to_list(100)
    
    for comment in comments:
        comment["_id"] = str(comment.get("_id", ""))
    
    post["comments"] = comments
    
    return post


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Excluir post (autor ou admin/supervisor)"""
    post = await db.timeline_posts.find_one({"id": post_id})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    
    # Verificar permissão
    is_author = post["author_id"] == current_user["sub"]
    is_moderator = current_user["role"] in ["admin", "supervisor"]
    
    if not is_author and not is_moderator:
        raise HTTPException(status_code=403, detail="Sem permissão para excluir este post")
    
    # Soft delete
    await db.timeline_posts.update_one(
        {"id": post_id},
        {"$set": {"is_active": False, "updated_at": datetime.now().isoformat()}}
    )
    
    return {"message": "Post excluído com sucesso"}


@router.put("/posts/{post_id}/pin")
async def pin_post(
    post_id: str,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Fixar/desfixar post (apenas admin/supervisor)"""
    post = await db.timeline_posts.find_one({"id": post_id})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    
    new_pinned_status = not post.get("is_pinned", False)
    
    await db.timeline_posts.update_one(
        {"id": post_id},
        {"$set": {"is_pinned": new_pinned_status, "updated_at": datetime.now().isoformat()}}
    )
    
    return {"message": "Post fixado" if new_pinned_status else "Post desfixado", "is_pinned": new_pinned_status}


# ==================== REAÇÕES ====================

@router.post("/posts/{post_id}/react")
async def react_to_post(
    post_id: str,
    reaction_type: str = Query("like", regex="^(like|love|celebrate|support|insightful)$"),
    current_user: dict = Depends(get_current_user)
):
    """Reagir a um post"""
    post = await db.timeline_posts.find_one({"id": post_id, "is_active": True})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    
    # Verificar se já reagiu
    existing_reaction = await db.timeline_reactions.find_one({
        "post_id": post_id,
        "user_id": current_user["sub"]
    })
    
    if existing_reaction:
        if existing_reaction["reaction_type"] == reaction_type:
            # Remover reação (toggle)
            await db.timeline_reactions.delete_one({"id": existing_reaction["id"]})
            await db.timeline_posts.update_one(
                {"id": post_id},
                {"$inc": {"likes_count": -1}}
            )
            return {"message": "Reação removida", "reacted": False}
        else:
            # Atualizar tipo de reação
            await db.timeline_reactions.update_one(
                {"id": existing_reaction["id"]},
                {"$set": {"reaction_type": reaction_type}}
            )
            return {"message": "Reação atualizada", "reacted": True, "reaction_type": reaction_type}
    
    # Criar nova reação
    reaction = TimelineReaction(
        post_id=post_id,
        user_id=current_user["sub"],
        reaction_type=reaction_type
    )
    
    await db.timeline_reactions.insert_one(reaction.model_dump())
    await db.timeline_posts.update_one(
        {"id": post_id},
        {"$inc": {"likes_count": 1}}
    )
    
    return {"message": "Reação adicionada", "reacted": True, "reaction_type": reaction_type}


# ==================== COMENTÁRIOS ====================

@router.post("/posts/{post_id}/comments")
async def add_comment(
    post_id: str,
    comment_data: TimelineCommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Adicionar comentário a um post"""
    post = await db.timeline_posts.find_one({"id": post_id, "is_active": True})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    
    comment = TimelineComment(
        post_id=post_id,
        author_id=current_user["sub"],
        author_name=current_user.get("full_name", "Unknown User"),
        author_avatar=current_user.get("profile_picture"),
        content=comment_data.content
    )
    
    await db.timeline_comments.insert_one(comment.model_dump())
    await db.timeline_posts.update_one(
        {"id": post_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return {"message": "Comentário adicionado", "comment": comment.model_dump()}


@router.get("/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Listar comentários de um post"""
    comments = await db.timeline_comments.find(
        {"post_id": post_id, "is_active": True}
    ).sort("created_at", 1).to_list(100)
    
    for comment in comments:
        comment["_id"] = str(comment.get("_id", ""))
    
    return {"comments": comments}


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Excluir comentário (autor ou admin/supervisor)"""
    comment = await db.timeline_comments.find_one({"id": comment_id})
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    
    # Verificar permissão
    is_author = comment["author_id"] == current_user["sub"]
    is_moderator = current_user["role"] in ["admin", "supervisor"]
    
    if not is_author and not is_moderator:
        raise HTTPException(status_code=403, detail="Sem permissão para excluir este comentário")
    
    # Soft delete
    await db.timeline_comments.update_one(
        {"id": comment_id},
        {"$set": {"is_active": False}}
    )
    
    # Decrementar contador
    await db.timeline_posts.update_one(
        {"id": comment["post_id"]},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"message": "Comentário excluído com sucesso"}


# ==================== MODERAÇÃO ====================

@router.get("/admin/posts")
async def admin_get_all_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    include_inactive: bool = False,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Lista todos os posts para moderação"""
    skip = (page - 1) * limit
    
    query = {} if include_inactive else {"is_active": True}
    
    posts = await db.timeline_posts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for post in posts:
        post["_id"] = str(post.get("_id", ""))
    
    total = await db.timeline_posts.count_documents(query)
    
    return {
        "posts": posts,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
