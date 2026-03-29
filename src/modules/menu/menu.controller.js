import { Router } from 'express';
import * as menuService from './service/menu.service.js';
import * as validators from './menu.validation.js';
import { validation } from '../../middleware/validation.middleware.js';
import { authentication, authorization } from '../../middleware/auth.middleware.js';
import { roleTypes } from '../../DB/Model/User.model.js';
import { uploadCloudFile } from '../../utils/multer/cloud.multer.js';
import { fileValidationTypes } from '../../utils/multer/local.multer.js';

const router = Router();
const upload = uploadCloudFile(fileValidationTypes.image);


router.get('/', 
    validation(validators.queryFilter), 
    menuService.getAllMenuItems
);

router.get('/grouped', 
    menuService.getMenu
);

router.get('/:id', 
    validation(validators.paramId), 
    menuService.getMenuItemById
);

// ================== Admin Routes ==================

router.post('/',
    authentication(),
    authorization([roleTypes.admin]),
    upload.fields([
        { name: 'image', maxCount: 1 }, 
        { name: 'categoryHeroImg', maxCount: 1 }
    ]),
    validation(validators.createMenuItem),
    menuService.createMenuItem
);

router.patch('/:id',
    authentication(),
    authorization([roleTypes.admin]),
    upload.fields([
        { name: 'image', maxCount: 1 }, 
        { name: 'categoryHeroImg', maxCount: 1 }
    ]),
    validation(validators.updateMenuItem),
    menuService.updateMenuItem
);

router.delete('/:id',
    authentication(),
    authorization([roleTypes.admin]),
    validation(validators.paramId),
    menuService.deleteMenuItem
);

export default router;
